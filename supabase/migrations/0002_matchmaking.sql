-- Cola de búsqueda: una fila por jugador buscando
create table public.matchmaking_queue (
  user_id      uuid primary key references public.users(id) on delete cascade,
  elo          int  not null,
  time_control text not null check (time_control in ('3+2', '5+0', '10+0')),
  is_bot       boolean not null default false,
  joined_at    timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index matchmaking_queue_tc_elo_idx  on public.matchmaking_queue (time_control, elo);
create index matchmaking_queue_seen_idx    on public.matchmaking_queue (last_seen_at);

-- Partidas: el Sprint 3 (arena) agrega jugadas y resultado
create table public.matches (
  id           uuid primary key default gen_random_uuid(),
  white_id     uuid not null references public.users(id) on delete cascade,
  black_id     uuid not null references public.users(id) on delete cascade,
  time_control text not null check (time_control in ('3+2', '5+0', '10+0')),
  status       text not null default 'pending' check (status in ('pending', 'active', 'finished', 'aborted')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint matches_distinct_players check (white_id <> black_id)
);
create index matches_white_status_idx on public.matches (white_id, status);
create index matches_black_status_idx on public.matches (black_id, status);
create trigger trg_matches_updated before update on public.matches
  for each row execute function public.touch_updated_at();

-- RLS activo sin policies: solo el backend (service_role) lee y escribe
alter table public.matchmaking_queue enable row level security;
alter table public.matches           enable row level security;

-- Ventana de ELO según el tiempo esperado: ±100, +50 cada 10 s, máximo ±400
create or replace function public.mm_window(waited interval)
returns int language sql immutable as $$
  select least(400, 100 + 50 * floor(extract(epoch from waited) / 10)::int)
$$;

-- Intenta emparejar a p_user. Devuelve el id de la partida creada o null.
create or replace function public.mm_try_pair(p_user uuid)
returns uuid language plpgsql as $$
declare
  me     public.matchmaking_queue%rowtype;
  rival  public.matchmaking_queue%rowtype;
  win    int;
  new_id uuid;
  w_id   uuid;
  b_id   uuid;
begin
  select * into me from public.matchmaking_queue where user_id = p_user;
  if not found then return null; end if;

  -- Un emparejamiento a la vez por ritmo
  perform pg_advisory_xact_lock(hashtext('mm:' || me.time_control));

  -- Releer con el candado tomado: otro proceso pudo emparejarlo ya
  select * into me from public.matchmaking_queue where user_id = p_user;
  if not found then return null; end if;

  update public.matchmaking_queue set last_seen_at = now() where user_id = p_user;
  win := public.mm_window(now() - me.joined_at);

  select q.* into rival
  from public.matchmaking_queue q
  where q.user_id <> p_user
    and q.time_control = me.time_control
    and (q.is_bot or q.last_seen_at > now() - interval '15 seconds')
    and abs(q.elo - me.elo) <= greatest(win, public.mm_window(now() - q.joined_at))
  order by abs(q.elo - me.elo), q.joined_at
  limit 1;

  if not found then return null; end if;

  if random() < 0.5 then w_id := me.user_id; b_id := rival.user_id;
  else                   w_id := rival.user_id; b_id := me.user_id; end if;

  insert into public.matches (white_id, black_id, time_control)
  values (w_id, b_id, me.time_control)
  returning id into new_id;

  delete from public.matchmaking_queue where user_id in (me.user_id, rival.user_id);
  return new_id;
end $$;

-- Limpia entradas abandonadas y bots viejos
create or replace function public.mm_cleanup()
returns void language sql as $$
  delete from public.matchmaking_queue
  where (not is_bot and last_seen_at < now() - interval '60 seconds')
     or (is_bot and joined_at < now() - interval '5 minutes');
$$;

-- Partida abierta de un jugador: activa, o pendiente de menos de 10 minutos
create or replace function public.mm_open_match(p_user uuid)
returns setof public.matches language sql stable as $$
  select * from public.matches
  where (white_id = p_user or black_id = p_user)
    and (status = 'active' or (status = 'pending' and created_at > now() - interval '10 minutes'))
  order by created_at desc
  limit 1;
$$;

-- Solo el backend (service_role) puede ejecutar estas funciones.
-- Sin esto, cualquiera con la anon key podría llamar mm_try_pair por la API REST de Supabase.
revoke execute on function public.mm_window(interval)  from public, anon, authenticated;
revoke execute on function public.mm_try_pair(uuid)    from public, anon, authenticated;
revoke execute on function public.mm_cleanup()         from public, anon, authenticated;
revoke execute on function public.mm_open_match(uuid)  from public, anon, authenticated;
grant  execute on function public.mm_window(interval)  to service_role;
grant  execute on function public.mm_try_pair(uuid)    to service_role;
grant  execute on function public.mm_cleanup()         to service_role;
grant  execute on function public.mm_open_match(uuid)  to service_role;
