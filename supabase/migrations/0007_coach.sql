-- ============================================================
-- 0007 · AI Coach: análisis del motor por partida, consejos por jugador y plan de entrenamiento
-- ============================================================

-- 1) Análisis del motor de una partida (objetivo: es el mismo para los dos jugadores)
create table if not exists public.match_analyses (
  match_id       uuid primary key references public.matches(id) on delete cascade,
  engine_version int  not null,
  analysis       jsonb not null,
  created_at     timestamptz not null default now()
);
alter table public.match_analyses enable row level security;

-- 2) Consejos para UN jugador sobre UNA partida (personal: depende de su color y su historial)
create table if not exists public.game_reviews (
  match_id       uuid not null references public.matches(id) on delete cascade,
  user_id        uuid not null references public.users(id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  version        int  not null default 0,
  facts          jsonb,                 -- la partida desde su lado: precisión, conteos, motivos, apertura, resultado
  ended_at       timestamptz,           -- cuándo se jugó (sale de facts): ordena el historial
  coach          jsonb,                 -- { summary, tips[], drill }
  source         text check (source in ('llm', 'template')),
  model          text,
  prompt_version int,
  error          text,
  attempts       int  not null default 0,
  lease_until    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (match_id, user_id),
  constraint game_reviews_ready_complete check (status <> 'ready' or (facts is not null and coach is not null and source is not null and ended_at is not null))
);
alter table public.game_reviews enable row level security;
create index if not exists game_reviews_user_ready_idx on public.game_reviews (user_id, ended_at desc) where status = 'ready';
drop trigger if exists trg_game_reviews_version on public.game_reviews;
create trigger trg_game_reviews_version before update on public.game_reviews for each row execute function public.bump_version();
drop trigger if exists trg_game_reviews_updated on public.game_reviews;
create trigger trg_game_reviews_updated before update on public.game_reviews for each row execute function public.touch_updated_at();

-- 3) Plan de entrenamiento de un jugador (uno por jugador, se regenera cuando hay partidas nuevas analizadas)
create table if not exists public.coach_summaries (
  user_id        uuid primary key references public.users(id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  version        int  not null default 0,
  stats          jsonb,
  plan           jsonb,
  source         text check (source in ('llm', 'template')),
  model          text,
  based_on       int,                   -- cuántas partidas analizadas usó
  based_on_until timestamptz,           -- updated_at de la más nueva que usó (para saber si quedó viejo)
  error          text,
  attempts       int  not null default 0,
  lease_until    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.coach_summaries enable row level security;
drop trigger if exists trg_coach_summaries_version on public.coach_summaries;
create trigger trg_coach_summaries_version before update on public.coach_summaries for each row execute function public.bump_version();
drop trigger if exists trg_coach_summaries_updated on public.coach_summaries;
create trigger trg_coach_summaries_updated before update on public.coach_summaries for each row execute function public.touch_updated_at();

-- 4) Pedir el análisis de una partida: idempotente. Si falló, lo vuelve a poner en cola.
create or replace function public.coach_request_review(p_match uuid, p_user uuid)
returns public.game_reviews language plpgsql as $$
declare m public.matches; r public.game_reviews;
begin
  select * into m from public.matches where id = p_match;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if p_user not in (m.white_id, m.black_id) then raise exception 'FORBIDDEN'; end if;
  if m.status <> 'finished' then raise exception 'MATCH_NOT_FINISHED'; end if;
  if m.ply < 6 then raise exception 'GAME_TOO_SHORT'; end if;
  insert into public.game_reviews as g (match_id, user_id) values (p_match, p_user)
  on conflict (match_id, user_id) do update
     set status = 'pending', error = null, attempts = 0, lease_until = null
   where g.status = 'failed'
  returning * into r;
  if r.match_id is null then
    select * into r from public.game_reviews where match_id = p_match and user_id = p_user;
  end if;
  return r;
end $$;

-- 5) Tomar el trabajo (un solo proceso). Tras 3 intentos caídos, queda 'failed'.
create or replace function public.coach_claim_review(p_match uuid, p_user uuid, p_ms int)
returns boolean language plpgsql as $$
begin
  update public.game_reviews
     set status = 'failed', error = 'Se agotaron los intentos', lease_until = null
   where match_id = p_match and user_id = p_user and status = 'pending'
     and attempts >= 3 and (lease_until is null or lease_until < now());
  update public.game_reviews
     set attempts = attempts + 1, lease_until = now() + p_ms * interval '1 millisecond'
   where match_id = p_match and user_id = p_user and status = 'pending'
     and attempts < 3 and (lease_until is null or lease_until < now());
  return found;
end $$;

create or replace function public.coach_finish_review(
  p_match uuid, p_user uuid, p_facts jsonb, p_coach jsonb, p_source text, p_model text, p_prompt_version int)
returns void language sql as $$
  update public.game_reviews
     set status = 'ready', facts = p_facts, ended_at = (p_facts ->> 'endedAt')::timestamptz,
         coach = p_coach, source = p_source, model = p_model,
         prompt_version = p_prompt_version, error = null, lease_until = null
   where match_id = p_match and user_id = p_user and status = 'pending'
$$;

create or replace function public.coach_fail_review(p_match uuid, p_user uuid, p_error text)
returns void language sql as $$
  update public.game_reviews
     set error = left(p_error, 300), lease_until = null,
         status = case when attempts >= 3 then 'failed' else 'pending' end
   where match_id = p_match and user_id = p_user and status = 'pending'
$$;

-- 6) Borrar el análisis (para volver a pedirlo). No mientras se está haciendo.
create or replace function public.coach_delete_review(p_match uuid, p_user uuid)
returns void language plpgsql as $$
begin
  delete from public.game_reviews where match_id = p_match and user_id = p_user and status <> 'pending';
  if found then return; end if;
  if exists (select 1 from public.game_reviews where match_id = p_match and user_id = p_user) then
    raise exception 'REVIEW_IN_PROGRESS';
  end if;
  raise exception 'REVIEW_NOT_FOUND';
end $$;

-- 7) Pedir el plan: si el que hay sigue al día o se está haciendo, lo devuelve; si no, lo pone en cola.
create or replace function public.coach_request_summary(p_user uuid, p_min_games int)
returns public.coach_summaries language plpgsql as $$
declare n int; latest timestamptz; s public.coach_summaries;
begin
  perform pg_advisory_xact_lock(hashtext('coach-summary:' || p_user::text));
  select count(*), max(updated_at) into n, latest from public.game_reviews where user_id = p_user and status = 'ready';
  if n < p_min_games then raise exception 'NOT_ENOUGH_GAMES:%', n; end if;
  select * into s from public.coach_summaries where user_id = p_user;
  -- based_on_until viene de un Date de JS (milisegundos) y updated_at tiene microsegundos
  if found and (s.status = 'pending' or (s.status = 'ready' and s.based_on_until >= date_trunc('milliseconds', latest))) then return s; end if;
  insert into public.coach_summaries as c (user_id) values (p_user)
  on conflict (user_id) do update set status = 'pending', error = null, attempts = 0, lease_until = null
  returning * into s;
  return s;
end $$;

create or replace function public.coach_claim_summary(p_user uuid, p_ms int)
returns boolean language plpgsql as $$
begin
  update public.coach_summaries
     set status = 'failed', error = 'Se agotaron los intentos', lease_until = null
   where user_id = p_user and status = 'pending' and attempts >= 3 and (lease_until is null or lease_until < now());
  update public.coach_summaries
     set attempts = attempts + 1, lease_until = now() + p_ms * interval '1 millisecond'
   where user_id = p_user and status = 'pending' and attempts < 3 and (lease_until is null or lease_until < now());
  return found;
end $$;

create or replace function public.coach_finish_summary(
  p_user uuid, p_stats jsonb, p_plan jsonb, p_source text, p_model text, p_based_on int, p_based_on_until timestamptz)
returns void language sql as $$
  update public.coach_summaries
     set status = 'ready', stats = p_stats, plan = p_plan, source = p_source, model = p_model,
         based_on = p_based_on, based_on_until = p_based_on_until, error = null, lease_until = null
   where user_id = p_user and status = 'pending'
$$;

create or replace function public.coach_fail_summary(p_user uuid, p_error text)
returns void language sql as $$
  update public.coach_summaries
     set error = left(p_error, 300), lease_until = null,
         status = case when attempts >= 3 then 'failed' else 'pending' end
   where user_id = p_user and status = 'pending'
$$;

-- 8) Permisos: solo el backend
do $$
declare f text;
begin
  foreach f in array array[
    'public.coach_request_review(uuid, uuid)', 'public.coach_claim_review(uuid, uuid, int)',
    'public.coach_finish_review(uuid, uuid, jsonb, jsonb, text, text, int)', 'public.coach_fail_review(uuid, uuid, text)',
    'public.coach_delete_review(uuid, uuid)', 'public.coach_request_summary(uuid, int)',
    'public.coach_claim_summary(uuid, int)', 'public.coach_finish_summary(uuid, jsonb, jsonb, text, text, int, timestamptz)',
    'public.coach_fail_summary(uuid, text)'] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
