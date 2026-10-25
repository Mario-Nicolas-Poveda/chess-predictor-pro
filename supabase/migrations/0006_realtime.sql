-- ============================================================
-- 0006 · Timbre en tiempo real: avisa a los navegadores cuando cambia una partida
-- ============================================================
-- Solo manda { v, ply, status } al canal público "match:<uuid>". No viaja nada privado:
-- el navegador, al oír el timbre, pide el estado a la API con su sesión (y su ETag).
create or replace function public.arena_ring() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform realtime.send(
      jsonb_build_object('v', new.version, 'ply', new.ply, 'status', new.status),
      'state',
      'match:' || new.id::text,
      false);                                  -- false = canal público
  exception when others then
    null;                                      -- el timbre nunca rompe una jugada: los clientes siguen con polling
  end;
  return null;
end $$;

drop trigger if exists trg_matches_ring on public.matches;
create trigger trg_matches_ring after update on public.matches
  for each row when (old.version is distinct from new.version)
  execute function public.arena_ring();

revoke execute on function public.arena_ring() from public, anon, authenticated;
