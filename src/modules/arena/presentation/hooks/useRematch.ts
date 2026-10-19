'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/apiClient';
import type { GameState } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { arenaApi } from '../api/arenaApi';

export type RematchView =
  | { kind: 'none'; notice?: string }
  | { kind: 'waiting' }
  | { kind: 'offered' }                   // te la pide el rival
  | { kind: 'accepted'; matchId: string };

const WATCH_MS = 2 * 60_000;   // la oferta caduca a los 2 min: después no hace falta seguir mirando

/**
 * Carga el estado final y vigila la revancha: cada 3 s durante 2 minutos (1,5 s con una oferta en juego), en pausa con la pestaña oculta.
 * Si la partida no terminó, vuelve a la arena.
 */
export function useRematch(matchId: string) {
  const router = useRouter();
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<RematchView>({ kind: 'none' });
  const [busy, setBusy] = useState(false);
  const [poke, setPoke] = useState(0);   // tras pedir o cancelar, se vuelve a vigilar otros 2 minutos

  const toLogin = useCallback(() => router.replace(`/login?next=${encodeURIComponent(`/dashboard/arena/${matchId}/resultado`)}`), [router, matchId]);

  /** Aplica lo que dice el servidor sobre la revancha. */
  const apply = useCallback((s: GameState) => {
    setState(s);
    const r = s.rematch;
    setView(cur => r?.matchId ? { kind: 'accepted', matchId: r.matchId }
      : r?.offeredBy && r.offeredBy !== s.yourColor ? { kind: 'offered' }
      : cur.kind === 'waiting' && !r?.offeredBy ? { kind: 'none', notice: `${s.opponent.username} no aceptó.` }
      : cur.kind === 'offered' && !r?.offeredBy ? { kind: 'none' } : cur);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();
    const run = async () => {
      if (document.hidden) { timer = setTimeout(run, 1000); return; }
      try {
        const r = await arenaApi.state(matchId, 0, null, ctrl.signal);
        if (r === 'not-modified') return;
        if (r.state.status !== 'finished') { router.replace(`/dashboard/arena/${matchId}`); return; }
        apply(r.state);
        if (r.state.rematch?.matchId) return;
        const hot = !!r.state.rematch?.offeredBy;
        if (hot || Date.now() - started < WATCH_MS) timer = setTimeout(run, hot ? 1500 : 3000);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        if (e instanceof ApiError && e.status === 401) { toLogin(); return; }
        if (e instanceof ApiError && e.status < 500) { setError(e.status === 403 ? 'No participas en esta partida.' : 'Esta partida no existe.'); return; }
        timer = setTimeout(run, 5000);   // red o 500: reintenta sin borrar lo que ya se ve
      }
    };
    void run();
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [matchId, router, apply, toLogin, poke]);

  const fail = (e: unknown) => {
    if (e instanceof ApiError && e.status === 401) return toLogin();
    if (e instanceof ApiError && e.code === 'ACTIVE_MATCH_EXISTS') return setView({ kind: 'none', notice: 'Uno de los dos ya está en otra partida o buscando.' });
    if (e instanceof ApiError && e.code === 'NO_REMATCH_OFFER') return setView({ kind: 'none' });
    setView({ kind: 'none', notice: e instanceof ApiError ? e.message : 'No se pudo conectar. Reintenta.' });
  };
  const act = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { fail(e); } finally { setBusy(false); setPoke(n => n + 1); } };

  return {
    state, error, view, busy,
    // pedir y aceptar son la misma llamada: 202 → esperando · 201 → aceptada
    request: () => act(async () => {
      const { rematch } = await arenaApi.rematch(matchId);
      setView(rematch.state === 'accepted' ? { kind: 'accepted', matchId: rematch.matchId } : { kind: 'waiting' });
    }),
    // cancelar la tuya o rechazar la del rival: 204
    cancel: () => act(async () => { await arenaApi.cancelRematch(matchId); setView({ kind: 'none' }); }),
  };
}
