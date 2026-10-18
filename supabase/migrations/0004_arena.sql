-- Bots marcados (en desarrollo juegan solos)
alter table public.users add column if not exists is_bot boolean not null default false;
update public.users set is_bot = true where username in ('bot_ana', 'bot_luis', 'bot_sara');

-- Estado de la partida
alter table public.matches
  add column version            int  not null default 0,
  add column ply                int  not null default 0,
  add column fen                text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  add column white_ms           int  not null default 0,
  add column black_ms           int  not null default 0,
  add column increment_ms       int  not null default 0,
  add column turn_started_at    timestamptz,
  add column started_at         timestamptz,
  add column ended_at           timestamptz,
  add column result             text check (result in ('white', 'black', 'draw')),
  add column end_reason         text check (end_reason in ('checkmate', 'resign', 'timeout', 'agreement', 'stalemate', 'insufficient', 'threefold', 'fifty')),
  add column draw_offer_by      text check (draw_offer_by in ('white', 'black')),
  add column draw_offered_at    timestamptz,
  add column rematch_offer_by   text check (rematch_offer_by in ('white', 'black')),
  add column rematch_offered_at timestamptz,
  add column rematch_id         uuid references public.matches(id),
  add column rematch_of         uuid references public.matches(id),
  add column white_elo_before   int,
  add column black_elo_before   int,
  add column white_elo_after    int,
  add column black_elo_after    int,
  add constraint matches_finished_complete
    check (status <> 'finished' or (result is not null and end_reason is not null and ended_at is not null));

create index matches_white_ended_idx on public.matches (white_id, ended_at desc) where status = 'finished';
create index matches_black_ended_idx on public.matches (black_id, ended_at desc) where status = 'finished';

-- Relojes según el ritmo
create or replace function public.arena_base_ms(tc text) returns int language sql immutable as $$
  select case tc when '3+2' then 180000 when '5+0' then 300000 else 600000 end
$$;
create or replace function public.arena_increment_ms(tc text) returns int language sql immutable as $$
  select case tc when '3+2' then 2000 else 0 end
$$;
create or replace function public.arena_init_match() returns trigger language plpgsql as $$
begin
  new.white_ms     := public.arena_base_ms(new.time_control);
  new.black_ms     := new.white_ms;
  new.increment_ms := public.arena_increment_ms(new.time_control);
  return new;
end $$;
create trigger trg_matches_init before insert on public.matches
  for each row execute function public.arena_init_match();

update public.matches
   set white_ms = public.arena_base_ms(time_control), black_ms = public.arena_base_ms(time_control),
       increment_ms = public.arena_increment_ms(time_control)
 where white_ms = 0;

-- Cada cambio de la fila sube la versión (ETag del polling)
create or replace function public.bump_version() returns trigger language plpgsql as $$
begin new.version := old.version + 1; return new; end $$;
create trigger trg_matches_version before update on public.matches
  for each row execute function public.bump_version();

-- Jugadas
create table public.match_moves (
  match_id   uuid not null references public.matches(id) on delete cascade,
  ply        int  not null check (ply >= 1),
  uci        text not null check (uci ~ '^[a-h][1-8][a-h][1-8][qrbn]?$'),
  san        text not null,
  fen_after  text not null,
  white_ms   int  not null,
  black_ms   int  not null,
  created_at timestamptz not null default now(),
  primary key (match_id, ply)
);
alter table public.match_moves enable row level security;

-- Estadísticas de un jugador tras una partida (score: 1, 0,5 o 0)
create or replace function public.arena_add_stats(p_user uuid, p_score numeric, p_elo int)
returns void language sql as $$
  update public.user_stats
     set games_played   = games_played + 1,
         wins           = wins   + (p_score = 1)::int,
         losses         = losses + (p_score = 0)::int,
         draws          = draws  + (p_score = 0.5)::int,
         current_streak = case when p_score = 1 then current_streak + 1 else 0 end,
         best_elo       = greatest(best_elo, p_elo)
   where user_id = p_user
$$;

-- Cierra la partida y aplica ELO (K = 32). Idempotente.
create or replace function public.arena_finish(
  p_match uuid, p_result text, p_reason text, p_white_ms int default null, p_black_ms int default null)
returns void language plpgsql as $$
declare
  m public.matches; w int; b int; e numeric; s numeric; dw int; db int;
begin
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if m.status in ('finished', 'aborted') then return; end if;
  select elo_rating into w from public.users where id = m.white_id for update;
  select elo_rating into b from public.users where id = m.black_id for update;
  e  := 1 / (1 + power(10::numeric, (b - w) / 400.0));          -- puntuación esperada de blancas
  s  := case p_result when 'white' then 1 when 'black' then 0 else 0.5 end;
  dw := round(32 * (s - e));
  db := round(32 * ((1 - s) - (1 - e)));
  update public.users set elo_rating = w + dw where id = m.white_id;
  update public.users set elo_rating = b + db where id = m.black_id;
  perform public.arena_add_stats(m.white_id, s, w + dw);
  perform public.arena_add_stats(m.black_id, 1 - s, b + db);
  update public.matches
     set status = 'finished', result = p_result, end_reason = p_reason, ended_at = now(),
         turn_started_at = null, draw_offer_by = null, draw_offered_at = null,
         white_ms = coalesce(p_white_ms, white_ms), black_ms = coalesce(p_black_ms, black_ms),
         white_elo_before = w, black_elo_before = b, white_elo_after = w + dw, black_elo_after = b + db
   where id = p_match;
end $$;

-- Guarda una jugada si nadie jugó antes (ply esperado). Si trae resultado, cierra la partida en la misma transacción.
create or replace function public.arena_commit_move(
  p_match uuid, p_expected_ply int, p_mover text, p_uci text, p_san text, p_fen text,
  p_white_ms int, p_black_ms int, p_result text default null, p_reason text default null)
returns int language plpgsql as $$
declare v_ply int;
begin
  update public.matches
     set ply = ply + 1, fen = p_fen, white_ms = p_white_ms, black_ms = p_black_ms,
         status = 'active', started_at = coalesce(started_at, now()), turn_started_at = now(),
         -- jugar responde a la oferta del rival (la rechaza); la propia sigue en pie
         draw_offer_by   = case when draw_offer_by = p_mover then draw_offer_by end,
         draw_offered_at = case when draw_offer_by = p_mover then draw_offered_at end
   where id = p_match and ply = p_expected_ply and status in ('pending', 'active')
  returning ply into v_ply;
  if v_ply is null then raise exception 'STALE_PLY'; end if;
  insert into public.match_moves (match_id, ply, uci, san, fen_after, white_ms, black_ms)
  values (p_match, v_ply, p_uci, p_san, p_fen, p_white_ms, p_black_ms);
  if p_result is not null then perform public.arena_finish(p_match, p_result, p_reason); end if;
  return v_ply;
end $$;

-- ¿Puede dar mate ese color con lo que le queda? (para decidir tablas cuando el rival se queda sin tiempo)
create or replace function public.arena_can_mate(p_fen text, p_color text) returns boolean language sql immutable as $$
  select case when p_color = 'white'
    then length(regexp_replace(split_part(p_fen, ' ', 1), '[^PRQ]', '', 'g')) > 0
      or length(regexp_replace(split_part(p_fen, ' ', 1), '[^NB]', '', 'g')) >= 2
    else length(regexp_replace(split_part(p_fen, ' ', 1), '[^prq]', '', 'g')) > 0
      or length(regexp_replace(split_part(p_fen, ' ', 1), '[^nb]', '', 'g')) >= 2
  end
$$;

-- Aplica el paso del tiempo: cancela pending viejas y cierra por tiempo. Se llama antes de leer o escribir.
create or replace function public.arena_settle(p_match uuid) returns void language plpgsql as $$
declare m public.matches; side text; winner text; left_ms bigint;
begin
  select * into m from public.matches where id = p_match for update;
  if not found then return; end if;
  if m.status = 'pending' and m.created_at < now() - interval '3 minutes' then
    update public.matches set status = 'aborted' where id = p_match;     -- nadie movió: sin ELO
    return;
  end if;
  if m.status <> 'active' or m.turn_started_at is null then return; end if;
  side    := case when m.ply % 2 = 0 then 'white' else 'black' end;
  left_ms := (case side when 'white' then m.white_ms else m.black_ms end)
             - floor(extract(epoch from (now() - m.turn_started_at)) * 1000);
  if left_ms > 0 then return; end if;
  winner := case side when 'white' then 'black' else 'white' end;
  perform public.arena_finish(p_match,
    case when public.arena_can_mate(m.fen, winner) then winner else 'draw' end, 'timeout',
    case when side = 'white' then 0 end, case when side = 'black' then 0 end);
end $$;

-- Lo mismo para todas las partidas abiertas de un usuario (lo usa el matchmaking)
create or replace function public.arena_settle_user(p_user uuid) returns void language plpgsql as $$
declare r record;
begin
  for r in select id from public.matches
            where status in ('pending', 'active') and (white_id = p_user or black_id = p_user) loop
    perform public.arena_settle(r.id);
  end loop;
end $$;

-- Aceptar tablas sin carreras
create or replace function public.arena_accept_draw(p_match uuid, p_by text) returns void language plpgsql as $$
declare m public.matches;
begin
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if m.status <> 'active' then raise exception 'MATCH_NOT_ACTIVE'; end if;
  if m.draw_offer_by is null then raise exception 'NO_DRAW_OFFER'; end if;
  if m.draw_offer_by = p_by then raise exception 'OWN_DRAW_OFFER'; end if;
  perform public.arena_finish(p_match, 'draw', 'agreement');
end $$;

-- Revancha: la primera llamada la ofrece (devuelve null); la del rival crea la partida con colores cambiados
create or replace function public.arena_rematch(p_match uuid, p_by text) returns uuid language plpgsql as $$
declare m public.matches; v_new uuid;
begin
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if m.status <> 'finished' then raise exception 'MATCH_NOT_FINISHED'; end if;
  if m.rematch_id is not null then return m.rematch_id; end if;
  if m.rematch_offer_by is null or m.rematch_offered_at < now() - interval '2 minutes' then
    update public.matches set rematch_offer_by = p_by, rematch_offered_at = now() where id = p_match;
    return null;
  end if;
  if m.rematch_offer_by = p_by then raise exception 'REMATCH_ALREADY_OFFERED'; end if;
  if exists (select 1 from public.matches x
              where (x.status = 'active' or (x.status = 'pending' and x.created_at > now() - interval '3 minutes'))
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

-- Historial de un usuario (para /matches y /profile/history)
create or replace function public.arena_history(p_user uuid, p_outcome text, p_before timestamptz, p_limit int)
returns table (id uuid, time_control text, ended_at timestamptz, your_color text, outcome text,
               end_reason text, elo_delta int, plies int, opponent_id uuid, opponent_elo int)
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
           case when m.white_id = p_user then m.black_elo_before else m.white_elo_before end as opponent_elo
      from public.matches m
     where m.status = 'finished' and (m.white_id = p_user or m.black_id = p_user)
       and (p_before is null or m.ended_at < p_before)
  ) h
  where p_outcome is null or h.outcome = p_outcome
  order by h.ended_at desc
  limit p_limit
$$;

-- ELO por día en la ventana, con un punto de partida el día anterior a la primera partida
create or replace function public.arena_elo_series(p_user uuid, p_days int)
returns table (day date, elo int) language sql stable as $$
  with g as (
    select m.ended_at,
           (m.ended_at at time zone 'America/Bogota')::date as d,
           case when m.white_id = p_user then m.white_elo_before else m.black_elo_before end as before_elo,
           case when m.white_id = p_user then m.white_elo_after  else m.black_elo_after  end as after_elo
      from public.matches m
     where m.status = 'finished' and (m.white_id = p_user or m.black_id = p_user)
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

-- Partida abierta de un jugador: activa, o pendiente de menos de 3 minutos (antes 10: es lo que tienen las blancas para mover)
create or replace function public.mm_open_match(p_user uuid)
returns setof public.matches language sql stable as $$
  select * from public.matches
  where (white_id = p_user or black_id = p_user)
    and (status = 'active' or (status = 'pending' and created_at > now() - interval '3 minutes'))
  order by created_at desc
  limit 1;
$$;

-- Solo el backend (service_role) puede ejecutar estas funciones, igual que en 0002.
-- Sin esto, cualquiera con la anon key podría llamar arena_finish por la API REST y cambiar el ELO.
revoke execute on function public.arena_base_ms(text)                                                 from public, anon, authenticated;
revoke execute on function public.arena_increment_ms(text)                                            from public, anon, authenticated;
revoke execute on function public.arena_add_stats(uuid, numeric, int)                                 from public, anon, authenticated;
revoke execute on function public.arena_finish(uuid, text, text, int, int)                            from public, anon, authenticated;
revoke execute on function public.arena_commit_move(uuid, int, text, text, text, text, int, int, text, text) from public, anon, authenticated;
revoke execute on function public.arena_can_mate(text, text)                                          from public, anon, authenticated;
revoke execute on function public.arena_settle(uuid)                                                  from public, anon, authenticated;
revoke execute on function public.arena_settle_user(uuid)                                             from public, anon, authenticated;
revoke execute on function public.arena_accept_draw(uuid, text)                                       from public, anon, authenticated;
revoke execute on function public.arena_rematch(uuid, text)                                           from public, anon, authenticated;
revoke execute on function public.arena_history(uuid, text, timestamptz, int)                         from public, anon, authenticated;
revoke execute on function public.arena_elo_series(uuid, int)                                         from public, anon, authenticated;
grant  execute on function public.arena_base_ms(text)                                                 to service_role;
grant  execute on function public.arena_increment_ms(text)                                            to service_role;
grant  execute on function public.arena_add_stats(uuid, numeric, int)                                 to service_role;
grant  execute on function public.arena_finish(uuid, text, text, int, int)                            to service_role;
grant  execute on function public.arena_commit_move(uuid, int, text, text, text, text, int, int, text, text) to service_role;
grant  execute on function public.arena_can_mate(text, text)                                          to service_role;
grant  execute on function public.arena_settle(uuid)                                                  to service_role;
grant  execute on function public.arena_settle_user(uuid)                                             to service_role;
grant  execute on function public.arena_accept_draw(uuid, text)                                       to service_role;
grant  execute on function public.arena_rematch(uuid, text)                                           to service_role;
grant  execute on function public.arena_history(uuid, text, timestamptz, int)                         to service_role;
grant  execute on function public.arena_elo_series(uuid, int)                                         to service_role;
