-- ============================================================
-- 0008 · El permiso de la IA solo se concede en la partida y la jugada vigentes (#173)
-- ============================================================

-- Dos PlayAiTurn pueden coincidir: si el primero termina la partida, arena_finish borra el permiso y el segundo,
-- que ya la había leído activa, lo creaba de nuevo. "for share" espera a arena_finish, que bloquea la misma fila.
create or replace function public.ai_claim(p_match uuid, p_ply int, p_ms int) returns boolean language plpgsql as $$
begin
  perform 1 from public.matches
    where id = p_match and status in ('pending', 'active') and ply = p_ply
    for share;
  if not found then return false; end if;
  insert into public.ai_leases as l (match_id, ply, until)
  values (p_match, p_ply, now() + p_ms * interval '1 millisecond')
  on conflict (match_id) do update set ply = excluded.ply, until = excluded.until
    where l.until < now() or l.ply <> excluded.ply;
  return found;
end $$;

-- Los permisos que ya quedaron en partidas cerradas
delete from public.ai_leases l
 using public.matches m
 where m.id = l.match_id and m.status not in ('pending', 'active');
