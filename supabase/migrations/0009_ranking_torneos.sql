-- ============================================================
-- 0009 · Ranking global, torneos (versión reducida), W.O. y salir sin registrar contra la IA
-- ============================================================
-- Todo lo que debe ser atómico vive aquí: inscribirse, salir, arrancar el torneo, decidir cada partida
-- y armar la siguiente. El backend solo llama a estas funciones (service_role); RLS sigue sin políticas.

-- 1) Motivo de final nuevo: 'noshow' (W.O.: las blancas no hicieron su primera jugada a tiempo).
--    El check viejo se busca por su definición (igual que en 0005 con time_control).
do $$
declare c text;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.matches'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) ilike '%end_reason%' loop
    execute format('alter table public.matches drop constraint %I', c);
  end loop;
end $$;
alter table public.matches add constraint matches_end_reason_check
  check (end_reason in ('checkmate', 'resign', 'timeout', 'agreement', 'stalemate', 'insufficient', 'threefold', 'fifty', 'noshow'));

-- 2) Torneos: eliminación directa de 4 u 8, una partida por ronda
create table if not exists public.tournaments (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 3 and 60),
  time_control text not null check (time_control in ('3+2', '5+0', '10+0')),
  size         smallint not null check (size in (4, 8)),          -- cupos
  bracket_size smallint check (bracket_size in (4, 8)),           -- se fija al empezar (8 si hay 5 o más)
  starts_at    timestamptz not null,
  noshow_s     int not null default 300 check (noshow_s between 5 and 600),   -- plazo para la primera jugada
  status       text not null default 'open' check (status in ('open', 'running', 'finished', 'cancelled')),
  winner_id    uuid references public.users(id),
  version      int not null default 0,
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  ended_at     timestamptz
);
alter table public.tournaments enable row level security;
create index if not exists tournaments_status_idx on public.tournaments (status, starts_at);
drop trigger if exists trg_tournaments_version on public.tournaments;
create trigger trg_tournaments_version before update on public.tournaments
  for each row execute function public.bump_version();

create table if not exists public.tournament_players (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  seed          smallint,                 -- 1 = mejor ELO al empezar
  elo_at_start  int,
  joined_at     timestamptz not null default now(),
  primary key (tournament_id, user_id)
);
alter table public.tournament_players enable row level security;
create index if not exists tournament_players_user_idx on public.tournament_players (user_id);

create table if not exists public.tournament_games (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round         smallint not null check (round between 1 and 3),
  slot          smallint not null check (slot between 1 and 4),   -- posición dentro de la ronda, de arriba abajo
  white_id      uuid not null references public.users(id),        -- la mejor siembra lleva blancas
  black_id      uuid references public.users(id),                 -- null = pasa directo (no hay rival)
  match_id      uuid unique references public.matches(id),
  status        text not null check (status in ('bye', 'playing', 'done')),
  winner_id     uuid references public.users(id),
  decided_by    text check (decided_by in ('bye', 'result', 'draw', 'noshow')),
  created_at    timestamptz not null default now(),
  primary key (tournament_id, round, slot),
  constraint tournament_games_bye check ((status = 'bye') = (black_id is null))
);
alter table public.tournament_games enable row level security;

alter table public.matches add column if not exists tournament_id uuid references public.tournaments(id);
create index if not exists matches_tournament_idx on public.matches (tournament_id) where tournament_id is not null;

-- 3) Orden de siembra de la primera ronda, de arriba abajo: 1-8, 4-5, 2-7, 3-6 (o 1-4, 2-3)
create or replace function public.tour_seed_order(p_size int) returns int[] language sql immutable as $$
  select case p_size when 4 then array[1, 4, 2, 3] else array[1, 8, 4, 5, 2, 7, 3, 6] end
$$;

-- 4) Crear un torneo (lo usan scripts/tournament.ts y la ruta de desarrollo)
create or replace function public.tour_create(p_name text, p_time_control text, p_size int, p_starts_at timestamptz, p_noshow_s int default 300)
returns public.tournaments language plpgsql as $$
declare t public.tournaments;
begin
  if p_starts_at < now() then raise exception 'STARTS_IN_PAST'; end if;
  insert into public.tournaments (name, time_control, size, starts_at, noshow_s)
  values (btrim(p_name), p_time_control, p_size, p_starts_at, p_noshow_s)
  returning * into t;
  return t;
end $$;

-- 5) Poner una partida en la llave. Sin rival → pasa directo. Con rival → crea la partida (con ELO).
create or replace function public.tour_place(p_t uuid, p_round int, p_slot int, p_white uuid, p_black uuid)
returns void language plpgsql as $$
declare t public.tournaments; v_match uuid;
begin
  select * into t from public.tournaments where id = p_t;
  if p_black is null then
    insert into public.tournament_games (tournament_id, round, slot, white_id, black_id, status, winner_id, decided_by)
    values (p_t, p_round, p_slot, p_white, null, 'bye', p_white, 'bye');
    return;
  end if;
  insert into public.matches (white_id, black_id, time_control, rated, tournament_id)
  values (p_white, p_black, t.time_control, true, p_t)
  returning id into v_match;
  insert into public.tournament_games (tournament_id, round, slot, white_id, black_id, match_id, status)
  values (p_t, p_round, p_slot, p_white, p_black, v_match, 'playing');
end $$;

-- 6) Tras decidir (round, slot): si su pareja también está decidida, arma la partida de la ronda siguiente.
--    En la final, cierra el torneo. Quien llama ya tiene bloqueado el torneo.
create or replace function public.tour_advance(p_t uuid, p_round int, p_slot int)
returns void language plpgsql as $$
declare
  t public.tournaments; last_round int; sib int; g1 public.tournament_games; g2 public.tournament_games;
  s1 int; s2 int; v_next int;
begin
  select * into t from public.tournaments where id = p_t;
  last_round := case t.bracket_size when 4 then 2 else 3 end;
  if p_round >= last_round then
    select * into g1 from public.tournament_games where tournament_id = p_t and round = p_round and slot = 1;
    if g1.winner_id is not null then
      update public.tournaments set status = 'finished', winner_id = g1.winner_id, ended_at = now()
       where id = p_t and status = 'running';
    end if;
    return;
  end if;
  sib := case when p_slot % 2 = 1 then p_slot + 1 else p_slot - 1 end;
  select * into g1 from public.tournament_games where tournament_id = p_t and round = p_round and slot = least(p_slot, sib);
  select * into g2 from public.tournament_games where tournament_id = p_t and round = p_round and slot = greatest(p_slot, sib);
  if g1.winner_id is null or g2.winner_id is null then return; end if;              -- falta la otra
  v_next := (p_slot + 1) / 2;
  if exists (select 1 from public.tournament_games where tournament_id = p_t and round = p_round + 1 and slot = v_next) then
    return;                                                                       -- ya estaba armada
  end if;
  select seed into s1 from public.tournament_players where tournament_id = p_t and user_id = g1.winner_id;
  select seed into s2 from public.tournament_players where tournament_id = p_t and user_id = g2.winner_id;
  if s1 < s2 then perform public.tour_place(p_t, p_round + 1, v_next, g1.winner_id, g2.winner_id);
  else            perform public.tour_place(p_t, p_round + 1, v_next, g2.winner_id, g1.winner_id);
  end if;
end $$;

-- 7) Empezar: con menos de 4 se cancela; si no, siembra por ELO y arma la primera ronda.
create or replace function public.tour_start(p_t uuid)
returns void language plpgsql as $$
declare t public.tournaments; n int; bsize int; ord int[]; k int; w uuid; b uuid;
begin
  select * into t from public.tournaments where id = p_t for update;
  if not found or t.status <> 'open' or t.starts_at > now() then return; end if;     -- otro proceso ya lo hizo
  select count(*) into n from public.tournament_players where tournament_id = p_t;
  if n < 4 then
    update public.tournaments set status = 'cancelled', ended_at = now() where id = p_t;
    return;
  end if;
  bsize := case when n <= 4 then 4 else 8 end;
  update public.tournament_players p
     set seed = s.seed, elo_at_start = s.elo
    from (select tp.user_id, u.elo_rating as elo,
                 row_number() over (order by u.elo_rating desc, tp.joined_at, tp.user_id) as seed
            from public.tournament_players tp join public.users u on u.id = tp.user_id
           where tp.tournament_id = p_t) s
   where p.tournament_id = p_t and p.user_id = s.user_id;
  -- quien estaba buscando partida sale de la cola (si otro proceso tiene esa fila, se salta: sin esperas)
  delete from public.matchmaking_queue
   where user_id in (select q.user_id from public.matchmaking_queue q
                      where q.user_id in (select user_id from public.tournament_players where tournament_id = p_t)
                        for update skip locked);
  update public.tournaments set status = 'running', started_at = now(), bracket_size = bsize where id = p_t;
  ord := public.tour_seed_order(bsize);
  for k in 1 .. bsize / 2 loop
    select user_id into w from public.tournament_players where tournament_id = p_t and seed = ord[2 * k - 1];
    b := null;
    select user_id into b from public.tournament_players where tournament_id = p_t and seed = ord[2 * k];
    perform public.tour_place(p_t, 1, k, w, b);
  end loop;
  for k in 1 .. bsize / 2 loop                    -- dos "pasa directo" seguidos ya arman la ronda 2
    perform public.tour_advance(p_t, 1, k);
  end loop;
end $$;

-- 8) Una partida de torneo terminó: anota quién pasa y arma lo que siga. Tablas → pasa quien jugó con negras.
--    Orden de bloqueo: la partida (ya bloqueada por quien la cerró) y después el torneo. Nunca al revés.
create or replace function public.tour_on_match_end() returns trigger language plpgsql as $$
declare g public.tournament_games; v_win uuid; v_how text;
begin
  perform 1 from public.tournaments where id = new.tournament_id for update;
  select * into g from public.tournament_games where match_id = new.id;
  if not found or g.status <> 'playing' then return null; end if;
  if new.status = 'aborted' then
    v_win := new.black_id; v_how := 'noshow';
  elsif new.result = 'draw' then
    v_win := new.black_id; v_how := 'draw';
  else
    v_win := case new.result when 'white' then new.white_id else new.black_id end;
    v_how := case when new.end_reason = 'noshow' then 'noshow' else 'result' end;
  end if;
  update public.tournament_games set status = 'done', winner_id = v_win, decided_by = v_how
   where tournament_id = g.tournament_id and round = g.round and slot = g.slot;
  update public.tournaments set version = version where id = g.tournament_id;   -- sube la versión: timbre y ETag
  perform public.tour_advance(g.tournament_id, g.round, g.slot);
  return null;
end $$;

drop trigger if exists trg_matches_tournament on public.matches;
create trigger trg_matches_tournament after update of status on public.matches
  for each row when (new.tournament_id is not null and old.status is distinct from new.status
                     and new.status in ('finished', 'aborted'))
  execute function public.tour_on_match_end();

-- 9) El tiempo en partidas de torneo: una 'pending' nunca se cancela. Si las blancas no juegan
--    en noshow_s segundos, pierden por W.O. y la partida queda sin ELO (no se jugó).
--    Lo demás es idéntico a 0005 (comprobar contra la última versión antes de aplicar).
create or replace function public.arena_settle(p_match uuid) returns void language plpgsql as $$
declare m public.matches; side text; winner text; left_ms bigint; v_noshow int;
begin
  select * into m from public.matches where id = p_match for update;
  if not found then return; end if;
  if m.status = 'pending' and m.tournament_id is not null then
    select noshow_s into v_noshow from public.tournaments where id = m.tournament_id;
    if m.created_at < now() - make_interval(secs => v_noshow) then
      update public.matches set rated = false where id = p_match;
      perform public.arena_finish(p_match, 'black', 'noshow');
    end if;
    return;
  end if;
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

-- 10) Aplicar el paso del tiempo a un torneo: primero sus partidas (cada una bloquea su fila),
--     después arrancarlo si ya es la hora. Se llama antes de leer o escribir.
create or replace function public.tour_settle(p_t uuid) returns void language plpgsql as $$
declare r record; v_status text; v_starts timestamptz;
begin
  -- skip locked: una partida que otro proceso está cerrando se salta (ese proceso ya hace el trabajo).
  -- Así nunca se espera una partida mientras se tiene bloqueado el torneo (sin interbloqueos).
  for r in select g.match_id
             from public.tournament_games g join public.matches m on m.id = g.match_id
            where g.tournament_id = p_t and g.status = 'playing' and m.status in ('pending', 'active')
              for update of m skip locked loop
    perform public.arena_settle(r.match_id);
  end loop;
  select status, starts_at into v_status, v_starts from public.tournaments where id = p_t;
  if v_status = 'open' and v_starts <= now() then perform public.tour_start(p_t); end if;
end $$;

-- 11) Inscribirse: 'created' (201) o 'exists' (200, ya estaba). Hasta la hora de inicio y con cupo.
create or replace function public.tour_join(p_t uuid, p_user uuid) returns text language plpgsql as $$
declare t public.tournaments; n int;
begin
  perform public.tour_settle(p_t);
  select * into t from public.tournaments where id = p_t for update;
  if not found then raise exception 'TOURNAMENT_NOT_FOUND'; end if;
  if exists (select 1 from public.tournament_players where tournament_id = p_t and user_id = p_user) then
    return 'exists';
  end if;
  if t.status <> 'open' or t.starts_at <= now() then raise exception 'TOURNAMENT_CLOSED'; end if;
  if exists (select 1 from public.users where id = p_user and (is_bot or ai_level is not null)) then
    raise exception 'FORBIDDEN';
  end if;
  select count(*) into n from public.tournament_players where tournament_id = p_t;
  if n >= t.size then raise exception 'TOURNAMENT_FULL'; end if;
  insert into public.tournament_players (tournament_id, user_id) values (p_t, p_user);
  update public.tournaments set version = version where id = p_t;
  return 'created';
end $$;

-- 12) Salir: solo antes de que empiece (204). 404 si no estabas inscrito.
create or replace function public.tour_leave(p_t uuid, p_user uuid) returns void language plpgsql as $$
declare t public.tournaments;
begin
  perform public.tour_settle(p_t);
  select * into t from public.tournaments where id = p_t for update;
  if not found then raise exception 'TOURNAMENT_NOT_FOUND'; end if;
  if not exists (select 1 from public.tournament_players where tournament_id = p_t and user_id = p_user) then
    raise exception 'NOT_REGISTERED';
  end if;
  if t.status <> 'open' then raise exception 'TOURNAMENT_CLOSED'; end if;
  delete from public.tournament_players where tournament_id = p_t and user_id = p_user;
  update public.tournaments set version = version where id = p_t;
end $$;

-- 13) Lecturas en una sola ida y vuelta (cada una aplica antes el paso del tiempo)
create or replace function public.tour_detail(p_t uuid) returns jsonb language plpgsql as $$
declare j jsonb;
begin
  perform public.tour_settle(p_t);
  select jsonb_build_object(
    'id', t.id, 'name', t.name, 'time_control', t.time_control, 'size', t.size, 'bracket_size', t.bracket_size,
    'starts_at', t.starts_at, 'noshow_s', t.noshow_s, 'status', t.status, 'version', t.version,
    'started_at', t.started_at, 'ended_at', t.ended_at, 'winner_id', t.winner_id,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', u.id, 'username', u.username, 'display_name', u.display_name, 'avatar_url', u.avatar_url,
               'elo', u.elo_rating, 'seed', p.seed, 'elo_at_start', p.elo_at_start, 'joined_at', p.joined_at)
             order by p.seed nulls last, u.elo_rating desc, p.joined_at)
        from public.tournament_players p join public.users u on u.id = p.user_id
       where p.tournament_id = t.id), '[]'::jsonb),
    'games', coalesce((
      select jsonb_agg(jsonb_build_object(
               'round', g.round, 'slot', g.slot, 'white_id', g.white_id, 'black_id', g.black_id,
               'match_id', g.match_id, 'status', g.status, 'winner_id', g.winner_id, 'decided_by', g.decided_by,
               'match_status', m.status, 'result', m.result, 'end_reason', m.end_reason, 'ply', m.ply,
               'created_at', m.created_at)
             order by g.round, g.slot)
        from public.tournament_games g left join public.matches m on m.id = g.match_id
       where g.tournament_id = t.id), '[]'::jsonb))
    into j
    from public.tournaments t where t.id = p_t;
  if j is null then raise exception 'TOURNAMENT_NOT_FOUND'; end if;
  return j;
end $$;

create or replace function public.tour_list(p_user uuid) returns jsonb language plpgsql as $$
declare r record;
begin
  for r in select id from public.tournaments where status = 'running' or (status = 'open' and starts_at <= now()) loop
    perform public.tour_settle(r.id);
  end loop;
  return jsonb_build_object(
    'tournaments', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.ord, x.starts_at)
        from (select t.id, t.name, t.time_control, t.size, t.bracket_size, t.starts_at, t.status, t.started_at, t.ended_at,
                     case t.status when 'running' then 0 when 'open' then 1 else 2 end as ord,
                     (select count(*) from public.tournament_players p where p.tournament_id = t.id) as players,
                     exists (select 1 from public.tournament_players p where p.tournament_id = t.id and p.user_id = p_user) as joined,
                     (select min(g.round) from public.tournament_games g where g.tournament_id = t.id and g.status = 'playing') as stage,
                     (select jsonb_build_object('id', u.id, 'username', u.username, 'display_name', u.display_name,
                                                'avatar_url', u.avatar_url, 'elo', u.elo_rating)
                        from public.users u where u.id = t.winner_id) as winner
                from public.tournaments t
               where t.status in ('open', 'running') or t.ended_at > now() - interval '30 days'
               order by case t.status when 'running' then 0 when 'open' then 1 else 2 end, t.starts_at desc
               limit 30) x), '[]'::jsonb),
    'next', (
      select jsonb_build_object(
               'tournament_id', t.id, 'tournament_name', t.name, 'match_id', m.id, 'round', g.round,
               'bracket_size', t.bracket_size, 'color', case when m.white_id = p_user then 'white' else 'black' end,
               'match_status', m.status,
               'deadline', case when m.status = 'pending' then m.created_at + make_interval(secs => t.noshow_s) end,
               'opponent', (select jsonb_build_object('id', u.id, 'username', u.username, 'display_name', u.display_name,
                                                      'avatar_url', u.avatar_url, 'elo', u.elo_rating)
                              from public.users u where u.id = case when m.white_id = p_user then m.black_id else m.white_id end))
        from public.tournament_games g
        join public.matches m on m.id = g.match_id
        join public.tournaments t on t.id = g.tournament_id
       where g.status = 'playing' and p_user in (g.white_id, g.black_id) and m.status in ('pending', 'active')
       order by m.created_at
       limit 1));
end $$;

-- 14) Timbre del torneo: igual que el de las partidas (0006), canal público "tournament:<uuid>"
create or replace function public.tour_ring() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform realtime.send(jsonb_build_object('v', new.version, 'status', new.status),
                          'state', 'tournament:' || new.id::text, false);
  exception when others then
    null;                                   -- el timbre nunca rompe nada: los clientes siguen con polling
  end;
  return null;
end $$;
drop trigger if exists trg_tournaments_ring on public.tournaments;
create trigger trg_tournaments_ring after update on public.tournaments
  for each row when (old.version is distinct from new.version)
  execute function public.tour_ring();

-- 15) Ranking global: solo personas (sin bots ni IA) y solo partidas con ELO entre personas.
--     Aparece quien tiene al menos p_min partidas. Orden: ELO (o victorias) y desempates fijos.
create or replace function public.ranking_page(p_user uuid, p_sort text, p_q text, p_limit int, p_offset int, p_min int default 5)
returns jsonb language sql stable as $$
  with humans as (
    select id, username, display_name, avatar_url, elo_rating
      from public.users where not is_bot and ai_level is null
  ),
  games as (
    select m.white_id as user_id, m.ended_at,
           case m.result when 'white' then 'win' when 'black' then 'loss' else 'draw' end as outcome
      from public.matches m
      join humans hw on hw.id = m.white_id join humans hb on hb.id = m.black_id
     where m.status = 'finished' and m.rated
    union all
    select m.black_id, m.ended_at,
           case m.result when 'black' then 'win' when 'white' then 'loss' else 'draw' end
      from public.matches m
      join humans hw on hw.id = m.white_id join humans hb on hb.id = m.black_id
     where m.status = 'finished' and m.rated
  ),
  stats as (
    select user_id, count(*)::int as games,
           (count(*) filter (where outcome = 'win'))::int  as wins,
           (count(*) filter (where outcome = 'draw'))::int as draws,
           (count(*) filter (where outcome = 'loss'))::int as losses
      from games group by user_id
  ),
  ranked as (
    select h.id, h.username, h.display_name, h.avatar_url, h.elo_rating as elo, s.games, s.wins, s.draws, s.losses,
           row_number() over (order by case when p_sort = 'wins' then s.wins end desc nulls last,
                                       h.elo_rating desc, s.wins desc, s.games desc, h.username) as rank
      from humans h join stats s on s.user_id = h.id
     where s.games >= p_min
  ),
  pattern as (
    select '%' || replace(replace(replace(p_q, '\', '\\'), '%', '\%'), '_', '\_') || '%' as q
  ),
  filtered as (
    select r.* from ranked r, pattern
     where p_q is null or r.username ilike pattern.q escape '\' or coalesce(r.display_name, '') ilike pattern.q escape '\'
  ),
  page as (
    select * from filtered order by rank limit p_limit offset p_offset
  )
  select jsonb_build_object(
    'players', (select count(*) from ranked),
    'total',   (select count(*) from filtered),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'rank', p.rank, 'id', p.id, 'username', p.username, 'display_name', p.display_name,
               'avatar_url', p.avatar_url, 'elo', p.elo, 'games', p.games, 'wins', p.wins, 'draws', p.draws, 'losses', p.losses,
               'last5', coalesce((select jsonb_agg(l.outcome order by l.ended_at desc)
                                    from (select g.outcome, g.ended_at from games g where g.user_id = p.id
                                           order by g.ended_at desc limit 5) l), '[]'::jsonb))
             order by p.rank)
        from page p), '[]'::jsonb),
    'you', (select jsonb_build_object(
                     'rank', r.rank, 'id', r.id, 'username', r.username, 'display_name', r.display_name,
                     'avatar_url', r.avatar_url, 'elo', r.elo, 'games', r.games, 'wins', r.wins, 'draws', r.draws, 'losses', r.losses,
                     'last5', coalesce((select jsonb_agg(l.outcome order by l.ended_at desc)
                                          from (select g.outcome, g.ended_at from games g where g.user_id = r.id
                                                 order by g.ended_at desc limit 5) l), '[]'::jsonb))
              from ranked r where r.id = p_user),
    'your_games', coalesce((select games from stats where user_id = p_user), 0))
$$;

-- 16) Contra la IA: salir sin registrar mientras no hayas jugado (204). Con jugadas tuyas → 409.
create or replace function public.ai_abort_game(p_match uuid, p_user uuid) returns void language plpgsql as $$
declare m public.matches;
begin
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if p_user not in (m.white_id, m.black_id) then raise exception 'FORBIDDEN'; end if;
  if not exists (select 1 from public.users where id in (m.white_id, m.black_id) and ai_level is not null) then
    raise exception 'NOT_AI_MATCH';
  end if;
  if m.status in ('finished', 'aborted') then raise exception 'MATCH_FINISHED'; end if;
  -- con blancas no has jugado si ply = 0; con negras, si solo jugó la IA (ply ≤ 1)
  if m.ply > (case when p_user = m.white_id then 0 else 1 end) then raise exception 'GAME_HAS_MOVES'; end if;
  update public.matches set status = 'aborted', turn_started_at = null where id = p_match;
  delete from public.ai_leases where match_id = p_match;
end $$;

-- 17) Permisos: solo el backend
do $$
declare f text;
begin
  foreach f in array array[
    'public.tour_seed_order(int)', 'public.tour_create(text, text, int, timestamptz, int)',
    'public.tour_place(uuid, int, int, uuid, uuid)', 'public.tour_advance(uuid, int, int)', 'public.tour_start(uuid)',
    'public.tour_on_match_end()', 'public.tour_settle(uuid)', 'public.tour_join(uuid, uuid)', 'public.tour_leave(uuid, uuid)',
    'public.tour_detail(uuid)', 'public.tour_list(uuid)', 'public.tour_ring()',
    'public.ranking_page(uuid, text, text, int, int, int)', 'public.ai_abort_game(uuid, uuid)'] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
