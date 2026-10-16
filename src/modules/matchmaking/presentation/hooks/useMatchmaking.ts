'use client';

import { useCallback, useEffect, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/apiClient';
import type { MatchmakingStatus, MatchSummary, TimeControl } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { matchmakingApi } from '../api/matchmakingApi';

type Searching = Extract<MatchmakingStatus, { state: 'searching' }>;
export type PlayState =
  | { phase: 'loading' }
  | { phase: 'lobby'; error?: string }
  | { phase: 'joining'; timeControl: TimeControl }
  | { phase: 'searching'; status: Searching }
  | { phase: 'leaving'; status: Searching }
  | { phase: 'matched'; match: MatchSummary };

type Action =
  | { type: 'LOBBY'; error?: string }
  | { type: 'JOIN'; timeControl: TimeControl }
  | { type: 'SEARCHING'; status: Searching }
  | { type: 'LEAVE' }
  | { type: 'MATCHED'; match: MatchSummary };

export function reducer(s: PlayState, a: Action): PlayState {
  switch (a.type) {
    case 'LOBBY':     return { phase: 'lobby', error: a.error };
    case 'JOIN':      return s.phase === 'lobby' ? { phase: 'joining', timeControl: a.timeControl } : s;
    case 'SEARCHING': return s.phase === 'leaving' ? s : { phase: 'searching', status: a.status };
    case 'LEAVE':     return s.phase === 'searching' ? { phase: 'leaving', status: s.status } : s;
    case 'MATCHED':   return { phase: 'matched', match: a.match };
  }
}

// No sale de la cola al desmontar: en desarrollo React monta dos veces. Al volver se reanuda;
// al cerrar la pestaña sale por pagehide; si no vuelve, el servidor lo descarta a los 15 s.
export function useMatchmaking() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, { phase: 'loading' });
  const toLogin = useCallback(() => router.replace('/login?next=/dashboard/play'), [router]);

  const apply = useCallback((s: MatchmakingStatus) => {
    if (s.state === 'idle') dispatch({ type: 'LOBBY' });
    else if (s.state === 'searching') dispatch({ type: 'SEARCHING', status: s });
    else dispatch({ type: 'MATCHED', match: s.match });
  }, []);

  // 1) Al entrar: reanudar lo que haya (seguía buscando o ya tenía partida)
  useEffect(() => {
    const ctrl = new AbortController();
    matchmakingApi.status(ctrl.signal).then(apply).catch(e => {
      if (ctrl.signal.aborted) return;
      if (e instanceof ApiError && e.status === 401) toLogin();
      else dispatch({ type: 'LOBBY', error: 'No pudimos cargar el estado. Intenta de nuevo.' });
    });
    return () => ctrl.abort();
  }, [apply, toLogin]);

  // 2) Polling mientras busca: setTimeout encadenado, pausa con la pestaña oculta y backoff con errores
  useEffect(() => {
    if (state.phase !== 'searching') return;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const tick = async () => {
      if (document.hidden) { timer = setTimeout(tick, 1000); return; }
      try {
        const s = await matchmakingApi.status(ctrl.signal);
        failures = 0;
        apply(s);
        if (s.state === 'searching') timer = setTimeout(tick, s.pollAfterMs ?? 2000);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        if (e instanceof ApiError && e.status === 401) { toLogin(); return; }
        failures += 1;
        if (failures >= 5) dispatch({ type: 'LOBBY', error: 'Perdimos la conexión. Vuelve a buscar.' });
        else timer = setTimeout(tick, Math.min(2000 * 2 ** failures, 15000));
      }
    };
    timer = setTimeout(tick, 0);
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [state.phase, apply, toLogin]);

  // 3) Si cierra la pestaña mientras busca: salir de la cola (keepalive deja terminar la petición)
  useEffect(() => {
    if (state.phase !== 'searching') return;
    const onHide = () => { void fetch('/api/v1/matchmaking/queue', { method: 'DELETE', keepalive: true, credentials: 'same-origin' }); };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [state.phase]);

  const join = useCallback(async (tc: TimeControl) => {
    dispatch({ type: 'JOIN', timeControl: tc });
    try {
      apply(await matchmakingApi.join(tc));
    } catch (e) {
      if (!(e instanceof ApiError)) return dispatch({ type: 'LOBBY', error: 'Sin conexión. Intenta de nuevo.' });
      if (e.status === 401) return toLogin();
      try {
        if (e.code === 'ALREADY_IN_QUEUE') return apply(await matchmakingApi.status());
        const matchId = e.meta?.matchId;
        if (e.code === 'ACTIVE_MATCH_EXISTS' && typeof matchId === 'string')
          return dispatch({ type: 'MATCHED', match: (await matchmakingApi.match(matchId)).match });
      } catch {
        return dispatch({ type: 'LOBBY', error: 'No pudimos recuperar tu búsqueda. Intenta de nuevo.' });
      }
      dispatch({ type: 'LOBBY', error: e.message });
    }
  }, [apply, toLogin]);

  const cancel = useCallback(async () => {
    dispatch({ type: 'LEAVE' });
    try { await matchmakingApi.leave(); dispatch({ type: 'LOBBY' }); }
    catch (e) {
      if (e instanceof ApiError && e.code === 'NOT_IN_QUEUE') return dispatch({ type: 'LOBBY' });   // ya estaba fuera
      dispatch({ type: 'LOBBY', error: 'No pudimos cancelar. Intenta de nuevo.' });
    }
  }, []);

  const abandon = useCallback(async (matchId: string) => {
    try { await matchmakingApi.abort(matchId); } catch { /* 404/409: igual vuelve al lobby */ }
    dispatch({ type: 'LOBBY' });
  }, []);

  return { state, join, cancel, abandon };
}
