-- ============================================================
-- 0005 · Contra la IA, deshacer, límites de uso y foto de perfil
-- ============================================================

-- 1) Un jugador IA por nivel. Son usuarios normales: así la arena del Sprint 3 sirve tal cual.
alter table public.users add column if not exists ai_level smallint check (ai_level between 1 and 5);
create unique index if not exists users_ai_level_key on public.users (ai_level) where ai_level is not null;

insert into public.users (email, username, password_hash, display_name, elo_rating, is_bot, ai_level) values
  ('ia_peon@ia.local',    'ia_peon',    null, 'IA · Peón',    800,  true, 1),
  ('ia_caballo@ia.local', 'ia_caballo', null, 'IA · Caballo', 1100, true, 2),
  ('ia_alfil@ia.local',   'ia_alfil',   null, 'IA · Alfil',   1400, true, 3),
  ('ia_torre@ia.local',   'ia_torre',   null, 'IA · Torre',   1700, true, 4),
  ('ia_dama@ia.local',    'ia_dama',    null, 'IA · Dama',    2000, true, 5)
on conflict do nothing;

-- 2) Partidas sin ELO, sin reloj, con predicción y deshacer
alter table public.matches
  add column if not exists rated         boolean not null default true,
  add column if not exists ai_prediction boolean not null default false,
  add column if not exists takebacks     int     not null default 0;

-- Quién está pensando la jugada de la IA (ver 9)
create table if not exists public.ai_leases (
  match_id uuid primary key references public.matches(id) on delete cascade,
  ply      int not null,
  until    timestamptz not null
);
alter table public.ai_leases enable row level security;

-- 'none' = sin reloj (solo contra la IA). El check viejo de time_control se busca por su definición.
do $$
declare c text;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.matches'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) ilike '%time_control%' loop
    execute format('alter table public.matches drop constraint %I', c);
  end loop;
end $$;
alter table public.matches add constraint matches_time_control_check
  check (time_control in ('3+2', '5+0', '10+0', 'none'));
alter table public.matches add constraint matches_untimed_unrated
  check (time_control <> 'none' or not rated);

create or replace function public.arena_base_ms(tc text) returns int language sql immutable as $$
  select case tc when 'none' then 0 when '3+2' then 180000 when '5+0' then 300000 else 600000 end
$$;

-- 3) El tiempo: igual que en 0004, pero sin reloj nunca se pierde por tiempo
create or replace function public.arena_settle(p_match uuid) returns void language plpgsql as $$
declare m public.matches; side text; winner text; left_ms bigint;
begin
  select * into m from public.matches where id = p_match for update;
  if not found then return; end if;
  if m.status = 'pending' and m.created_at < now() - interval '3 minutes' then
    update public.matches set status = 'aborted' where id = p_match;
    return;
  end if;
  if m.status <> 'active' or m.turn_started_at is null or m.time_control = 'none' then return; end if;
  side    := case when m.ply % 2 = 0 then 'white' else 'black' end;
  left_ms := (case side when 'white' then m.white_ms else m.black_ms end)
             - floor(extract(epoch from (now() - m.turn_started_at)) * 1000);
  if left_ms > 0 then return; end if;
  winner := case side when 'white' then 'black' else 'white' end;
  perform public.arena_finish(p_match,
    case when public.arena_can_mate(m.fen, winner) then winner else 'draw' end, 'timeout',
    case when side = 'white' then 0 end, case when side = 'black' then 0 end);
end $$;

-- 4) Final: igual que en 0004; si la partida no da ELO, se cierra sin tocar ELO ni estadísticas
create or replace function public.arena_finish(
  p_match uuid, p_result text, p_reason text, p_white_ms int default null, p_black_ms int default null)
returns void language plpgsql as $$
declare
  m public.matches; w int; b int; e numeric; s numeric; dw int := 0; db int := 0;
begin
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if m.status in ('finished', 'aborted') then return; end if;
  select elo_rating into w from public.users where id = m.white_id for update;
  select elo_rating into b from public.users where id = m.black_id for update;
  if m.rated then
    e  := 1 / (1 + power(10::numeric, (b - w) / 400.0));
    s  := case p_result when 'white' then 1 when 'black' then 0 else 0.5 end;
    dw := round(32 * (s - e));
    db := round(32 * ((1 - s) - (1 - e)));
    update public.users set elo_rating = w + dw where id = m.white_id;
    update public.users set elo_rating = b + db where id = m.black_id;
    perform public.arena_add_stats(m.white_id, s, w + dw);
    perform public.arena_add_stats(m.black_id, 1 - s, b + db);
  end if;
  update public.matches
     set status = 'finished', result = p_result, end_reason = p_reason, ended_at = now(),
         turn_started_at = null, draw_offer_by = null, draw_offered_at = null,
         white_ms = coalesce(p_white_ms, white_ms), black_ms = coalesce(p_black_ms, black_ms),
         white_elo_before = w, black_elo_before = b, white_elo_after = w + dw, black_elo_after = b + db
   where id = p_match;
  delete from public.ai_leases where match_id = p_match;
end $$;

-- 5) Solo las partidas con ELO bloquean el emparejamiento y la revancha (una partida contra la IA no)
create or replace function public.mm_open_match(p_user uuid)
returns setof public.matches language sql stable as $$
  select * from public.matches
  where (white_id = p_user or black_id = p_user)
    and rated
    and (status = 'active' or (status = 'pending' and created_at > now() - interval '3 minutes'))
  order by created_at desc
  limit 1;
$$;

create or replace function public.arena_rematch(p_match uuid, p_by text) returns uuid language plpgsql as $$
declare m public.matches; v_new uuid;
begin
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if not m.rated then raise exception 'NOT_RATED_MATCH'; end if;
  if m.status <> 'finished' then raise exception 'MATCH_NOT_FINISHED'; end if;
  if m.rematch_id is not null then return m.rematch_id; end if;
  if m.rematch_offer_by is null or m.rematch_offered_at < now() - interval '2 minutes' then
    update public.matches set rematch_offer_by = p_by, rematch_offered_at = now() where id = p_match;
    return null;
  end if;
  if m.rematch_offer_by = p_by then raise exception 'REMATCH_ALREADY_OFFERED'; end if;
  if exists (select 1 from public.matches x
              where x.rated
                and (x.status = 'active' or (x.status = 'pending' and x.created_at > now() - interval '3 minutes'))
                and (x.white_id in (m.white_id, m.black_id) or x.black_id in (m.white_id, m.black_id)))
     or exists (select 1 from public.matchmaking_queue q where q.user_id in (m.white_id, m.black_id)) then
    raise exception 'ACTIVE_MATCH_EXISTS';
  end if;
  insert into public.matches (white_id, black_id, time_control, rematch_of)
  values (m.black_id, m.white_id, m.time_control, p_match)
  returning id into v_new;
  update public.matches set rematch_id = v_new, rematch_offer_by = null, rematch_offered_at = null where id = p_match;
  return v_new;
end $$;

-- 6) Historial: dice si la partida dio ELO y puede filtrar (el perfil solo cuenta las que dan ELO)
drop function if exists public.arena_history(uuid, text, timestamptz, int);
create or replace function public.arena_history(p_user uuid, p_outcome text, p_before timestamptz, p_limit int, p_rated boolean default null)
returns table (id uuid, time_control text, ended_at timestamptz, your_color text, outcome text,
               end_reason text, elo_delta int, plies int, opponent_id uuid, opponent_elo int, rated boolean)
language sql stable as $$
  select * from (
    select m.id, m.time_control, m.ended_at,
           case when m.white_id = p_user then 'white' else 'black' end as your_color,
           case when m.result = 'draw' then 'draw'
                when (m.result = 'white') = (m.white_id = p_user) then 'win' else 'loss' end as outcome,
           m.end_reason,
           case when m.white_id = p_user then m.white_elo_after - m.white_elo_before
                else m.black_elo_after - m.black_elo_before end as elo_delta,
           m.ply as plies,
           case when m.white_id = p_user then m.black_id else m.white_id end as opponent_id,
           case when m.white_id = p_user then m.black_elo_before else m.white_elo_before end as opponent_elo,
           m.rated
      from public.matches m
     where m.status = 'finished' and (m.white_id = p_user or m.black_id = p_user)
       and (p_before is null or m.ended_at < p_before)
       and (p_rated is null or m.rated = p_rated)
  ) h
  where p_outcome is null or h.outcome = p_outcome
  order by h.ended_at desc
  limit p_limit
$$;

create or replace function public.arena_elo_series(p_user uuid, p_days int)
returns table (day date, elo int) language sql stable as $$
  with g as (
    select m.ended_at,
           (m.ended_at at time zone 'America/Bogota')::date as d,
           case when m.white_id = p_user then m.white_elo_before else m.black_elo_before end as before_elo,
           case when m.white_id = p_user then m.white_elo_after  else m.black_elo_after  end as after_elo
      from public.matches m
     where m.status = 'finished' and m.rated and (m.white_id = p_user or m.black_id = p_user)
       and m.ended_at >= now() - make_interval(days => p_days)
  ), first_point as (
    select d - 1 as d, before_elo as e from g order by ended_at asc limit 1
  ), daily as (
    select distinct on (d) d, after_elo as e from g order by d, ended_at desc
  )
  select d, e from first_point
  union all
  select d, e from daily
  order by 1
$$;

-- 7) Crear una partida contra la IA (una sin terminar por usuario)
create or replace function public.ai_create_game(p_user uuid, p_level int, p_color text, p_time_control text, p_prediction boolean)
returns uuid language plpgsql as $$
declare v_ai uuid; v_white uuid; v_black uuid; v_open uuid; v_id uuid; r record;
begin
  perform pg_advisory_xact_lock(hashtext('ai-game:' || p_user::text));       -- dos clics seguidos no crean dos
  for r in select id from public.matches
            where not rated and status in ('pending', 'active') and (white_id = p_user or black_id = p_user) loop
    perform public.arena_settle(r.id);
  end loop;
  select id into v_open from public.matches
   where not rated and status in ('pending', 'active') and (white_id = p_user or black_id = p_user)
   order by created_at desc limit 1;
  if v_open is not null then raise exception 'AI_GAME_IN_PROGRESS:%', v_open; end if;
  select id into v_ai from public.users where ai_level = p_level;
  if v_ai is null then raise exception 'AI_LEVEL_NOT_FOUND'; end if;
  if p_color = 'white' then v_white := p_user; v_black := v_ai; else v_white := v_ai; v_black := p_user; end if;
  insert into public.matches (white_id, black_id, time_control, rated, ai_prediction)
  values (v_white, v_black, p_time_control, false, p_prediction)
  returning id into v_id;
  return v_id;
end $$;

-- 8) Deshacer contra la IA: quita tu última jugada y la respuesta de la IA
create or replace function public.arena_takeback(p_match uuid, p_color text, p_expected_ply int)
returns int language plpgsql as $$
declare m public.matches; v_target int; prev public.match_moves; base_ms int;
begin
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if m.rated then raise exception 'NOT_AI_MATCH'; end if;
  if m.status not in ('pending', 'active') then raise exception 'MATCH_FINISHED'; end if;
  if m.ply <> p_expected_ply then raise exception 'STALE_PLY'; end if;
  if (case when m.ply % 2 = 0 then 'white' else 'black' end) <> p_color then raise exception 'AI_THINKING'; end if;
  v_target := m.ply - 2;                                       -- antes de tu última jugada
  if v_target < (case p_color when 'white' then 0 else 1 end) then raise exception 'NOTHING_TO_UNDO'; end if;
  base_ms := public.arena_base_ms(m.time_control);
  if v_target > 0 then
    select * into prev from public.match_moves where match_id = p_match and ply = v_target;
  end if;
  delete from public.match_moves where match_id = p_match and ply > v_target;
  update public.matches
     set ply = v_target,
         fen = coalesce(prev.fen_after, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
         white_ms = coalesce(prev.white_ms, base_ms), black_ms = coalesce(prev.black_ms, base_ms),
         turn_started_at = now(), draw_offer_by = null, draw_offered_at = null,
         takebacks = takebacks + 1
   where id = p_match;
  delete from public.ai_leases where match_id = p_match;
  return v_target;
end $$;

-- 9) Turno de la IA: solo un proceso piensa cada jugada (el que gana el "permiso")
create or replace function public.ai_claim(p_match uuid, p_ply int, p_ms int) returns boolean language plpgsql as $$
begin
  insert into public.ai_leases as l (match_id, ply, until)
  values (p_match, p_ply, now() + p_ms * interval '1 millisecond')
  on conflict (match_id) do update set ply = excluded.ply, until = excluded.until
    where l.until < now() or l.ply <> excluded.ply;
  return found;
end $$;

-- 10) Límite de uso por ventana fija (429). Devuelve 0 si se permite o los segundos que faltan.
create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null,
  hits         int not null
);
alter table public.rate_limits enable row level security;

create or replace function public.rate_hit(p_key text, p_limit int, p_window_s int) returns int language plpgsql as $$
declare r public.rate_limits;
begin
  insert into public.rate_limits as t (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update
     set window_start = case when t.window_start <= now() - make_interval(secs => p_window_s) then now() else t.window_start end,
         hits         = case when t.window_start <= now() - make_interval(secs => p_window_s) then 1 else t.hits + 1 end
  returning * into r;
  if r.hits <= p_limit then return 0; end if;
  return greatest(1, ceil(extract(epoch from (r.window_start + make_interval(secs => p_window_s) - now())))::int);
end $$;

-- 11) Foto de perfil en Supabase Storage (bucket público; solo el backend escribe)
alter table public.users add column if not exists avatar_path text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 12) Permisos: solo el backend (service_role) ejecuta las funciones
do $$
declare f text;
begin
  foreach f in array array[
    'public.ai_create_game(uuid, int, text, text, boolean)', 'public.arena_takeback(uuid, text, int)',
    'public.ai_claim(uuid, int, int)', 'public.rate_hit(text, int, int)',
    'public.arena_history(uuid, text, timestamptz, int, boolean)'] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
