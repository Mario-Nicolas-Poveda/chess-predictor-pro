-- ============================================================
-- Limpieza de usuarios de prueba (#90). Correr antes de cada demo y antes del ranking del Sprint 6.
-- ============================================================
-- Usuarios de prueba: correos @t.dev (tests/arena, ai, avatar.http.sh), @test.dev (tests/auth.http.sh)
-- y prueba_jose (prueba manual). Nunca bots ni IA.
-- Lo que cuelga de ellos se va por "on delete cascade": user_stats, matchmaking_queue, matches,
-- match_moves y ai_leases. Las fotos subidas quedan en Storage: se listan en la vista previa.
--
-- 1) Vista previa: selecciona solo este bloque y pulsa Run (el SQL Editor corre solo lo seleccionado).
with t as (
  select id, avatar_path from public.users
  where (lower(email) like '%@t.dev' or lower(email) like '%@test.dev' or lower(username) = 'prueba_jose')
    and not is_bot
)
select
  (select count(*) from t)                                                               as usuarios,
  (select count(*) from public.matches m where m.white_id in (select id from t) or m.black_id in (select id from t)) as partidas,
  (select count(*) from public.match_moves mv join public.matches m on m.id = mv.match_id
     where m.white_id in (select id from t) or m.black_id in (select id from t))         as jugadas,
  (select count(*) from public.matches m join public.users o
     on o.id = case when m.white_id in (select id from t) then m.black_id else m.white_id end
     where (m.white_id in (select id from t) or m.black_id in (select id from t))
       and o.id not in (select id from t) and not o.is_bot)                              as partidas_con_cuentas_reales, -- debe ser 0
  (select string_agg(avatar_path, ', ') from t where avatar_path is not null)            as fotos_en_storage;

-- 2) Borrado: corre el archivo completo. Todo o nada; si hay partidas con cuentas reales, no borra nada.
begin;

create temp table test_users on commit drop as
  select id from public.users
  where (lower(email) like '%@t.dev' or lower(email) like '%@test.dev' or lower(username) = 'prueba_jose')
    and not is_bot;

do $$
begin
  if exists (
    select 1 from public.matches m join public.users o
      on o.id = case when m.white_id in (select id from test_users) then m.black_id else m.white_id end
    where (m.white_id in (select id from test_users) or m.black_id in (select id from test_users))
      and o.id not in (select id from test_users) and not o.is_bot
  ) then
    raise exception 'Hay partidas entre usuarios de prueba y cuentas reales: borrarlas cambiaría su historial. No se borró nada.';
  end if;
end $$;

delete from public.users where id in (select id from test_users);

commit;

-- 3) Comprobación: 0 usuarios de prueba; bots e IA siguen ahí.
select
  (select count(*) from public.users
     where lower(email) like '%@t.dev' or lower(email) like '%@test.dev' or lower(username) = 'prueba_jose') as quedan_de_prueba,
  (select count(*) from public.users where is_bot)                                                          as bots_e_ia,
  (select count(*) from public.users where not is_bot)                                                      as cuentas_reales;
