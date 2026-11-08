-- ============================================================
-- 0010 · Roles: jugador (con cuenta) e invitado (sin registro)
-- ============================================================
-- El rol va en el JWT y lo revisa cada ruta (por defecto, solo jugadores). Esto es la segunda capa:
-- aunque una ruta se equivoque, la BD no deja que un invitado juegue con ELO, haga cola, entre a un
-- torneo ni use el entrenador. Los invitados viven 7 días y después se borran solos.

-- 1) Rol y caducidad. Un invitado no tiene correo ni clave.
alter table public.users add column if not exists role text not null default 'player'
  check (role in ('player', 'guest'));
alter table public.users add column if not exists guest_expires_at timestamptz;
alter table public.users alter column email drop not null;
alter table public.users drop constraint if exists users_role_fields;   -- se puede correr dos veces
alter table public.users add constraint users_role_fields check (
  (role = 'player' and email is not null and guest_expires_at is null)
  or (role = 'guest' and email is null and password_hash is null and guest_expires_at is not null));
create index if not exists users_guest_expires_idx on public.users (guest_expires_at) where role = 'guest';

-- auth_provider admite 'guest' (el check viejo se busca por su definición, como en 0005 y 0009)
do $$
declare c text;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.users'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) ilike '%auth_provider%' loop
    execute format('alter table public.users drop constraint %I', c);
  end loop;
end $$;
alter table public.users add constraint users_auth_provider_check
  check (auth_provider in ('local', 'google', 'guest'));

-- 2) Segunda capa: lo que un invitado no puede hacer, la BD tampoco lo deja pasar
create or replace function public.guard_guest() returns trigger language plpgsql as $$
declare v_users uuid[];
begin
  if tg_table_name = 'matches' then
    if not new.rated then return new; end if;                 -- contra la IA (sin ELO): sí
    v_users := array[new.white_id, new.black_id];
  else
    v_users := array[new.user_id];
  end if;
  if exists (select 1 from public.users where id = any(v_users) and role = 'guest') then
    raise exception 'ACCOUNT_REQUIRED';
  end if;
  return new;
end $$;

drop trigger if exists trg_matches_guest on public.matches;
create trigger trg_matches_guest before insert on public.matches
  for each row execute function public.guard_guest();
drop trigger if exists trg_queue_guest on public.matchmaking_queue;
create trigger trg_queue_guest before insert on public.matchmaking_queue
  for each row execute function public.guard_guest();
drop trigger if exists trg_tplayers_guest on public.tournament_players;
create trigger trg_tplayers_guest before insert on public.tournament_players
  for each row execute function public.guard_guest();
drop trigger if exists trg_reviews_guest on public.game_reviews;
create trigger trg_reviews_guest before insert on public.game_reviews
  for each row execute function public.guard_guest();
drop trigger if exists trg_summaries_guest on public.coach_summaries;
create trigger trg_summaries_guest before insert on public.coach_summaries
  for each row execute function public.guard_guest();

-- 3) Borrar invitados con todo lo suyo (partidas contra la IA, límites). Solo borra invitados.
create or replace function public.guest_delete_many(p_ids uuid[]) returns int language plpgsql as $$
declare v_ids uuid[]; v_matches uuid[];
begin
  select array_agg(id) into v_ids from public.users where id = any(p_ids) and role = 'guest';
  if v_ids is null then return 0; end if;
  select array_agg(id) into v_matches from public.matches where white_id = any(v_ids) or black_id = any(v_ids);
  if v_matches is not null then
    update public.matches set rematch_id = null where rematch_id = any(v_matches);
    update public.matches set rematch_of = null where rematch_of = any(v_matches);
    delete from public.matches where id = any(v_matches);          -- y jugadas, análisis, permisos de la IA
  end if;
  delete from public.rate_limits r where exists (select 1 from unnest(v_ids) g where r.key like '%' || g::text);
  delete from public.users where id = any(v_ids);                   -- y estadísticas, preferencias
  return array_length(v_ids, 1);
end $$;

create or replace function public.guest_delete(p_user uuid) returns boolean language sql as $$
  select public.guest_delete_many(array[p_user]) = 1
$$;

-- Los vencidos, de a poco y sin esperar filas bloqueadas (se llama al crear invitados)
create or replace function public.guest_purge(p_limit int default 100) returns int language plpgsql as $$
declare v_ids uuid[];
begin
  select array_agg(id) into v_ids
    from (select id from public.users
           where role = 'guest' and guest_expires_at < now()
           order by guest_expires_at limit p_limit
             for update skip locked) s;
  return coalesce(public.guest_delete_many(v_ids), 0);
end $$;

-- 4) Crear un invitado: nombre invitado_xxxxxx, 7 días. Con cupo máximo para no llenar la BD.
create or replace function public.guest_create(p_ttl_s int default 604800, p_max int default 1000)
returns public.users language plpgsql as $$
declare u public.users; i int;
begin
  perform public.guest_purge(20);
  if (select count(*) from public.users where role = 'guest') >= p_max then
    raise exception 'GUEST_CAPACITY';
  end if;
  for i in 1 .. 5 loop
    begin
      insert into public.users (email, username, display_name, role, auth_provider, guest_expires_at)
      values (null, 'invitado_' || substr(md5(gen_random_uuid()::text), 1, 6), 'Invitado', 'guest', 'guest',
              now() + make_interval(secs => p_ttl_s))
      returning * into u;
      return u;
    exception when unique_violation then
      null;                                                          -- nombre repetido: otro intento
    end;
  end loop;
  raise exception 'GUEST_NAME_RETRY';
end $$;

-- 5) De invitado a jugador: misma fila (se quedan sus partidas contra la IA)
create or replace function public.guest_upgrade(p_user uuid, p_email text, p_username text, p_hash text)
returns public.users language plpgsql as $$
declare u public.users;
begin
  select * into u from public.users where id = p_user for update;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  if u.role <> 'guest' then raise exception 'ALREADY_REGISTERED'; end if;
  if u.guest_expires_at < now() then raise exception 'GUEST_EXPIRED'; end if;
  if exists (select 1 from public.users where lower(email) = lower(p_email)) then raise exception 'EMAIL_TAKEN'; end if;
  if exists (select 1 from public.users where lower(username) = lower(p_username) and id <> p_user) then
    raise exception 'USERNAME_TAKEN';
  end if;
  update public.users
     set role = 'player', email = lower(p_email), username = p_username, password_hash = p_hash,
         auth_provider = 'local', guest_expires_at = null,
         display_name = case when display_name = 'Invitado' then p_username else display_name end
   where id = p_user
  returning * into u;
  return u;
exception when unique_violation then                               -- carrera con otro registro
  raise exception '%', case when sqlerrm ilike '%email%' then 'EMAIL_TAKEN' else 'USERNAME_TAKEN' end;
end $$;

-- 6) Permisos: solo el backend
do $$
declare f text;
begin
  foreach f in array array[
    'public.guard_guest()', 'public.guest_delete_many(uuid[])', 'public.guest_delete(uuid)', 'public.guest_purge(int)',
    'public.guest_create(int, int)', 'public.guest_upgrade(uuid, text, text, text)'] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
