'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/apiClient';
import type { GameState, MoveDTO } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { arenaApi } from '../api/arenaApi';
import { livePosition, sameBoard } from '../game/livePosition';

type S = { server: GameState | null; moves: MoveDTO[]; etag: string | null; offset: number; optimistic: string | null; notice: string; offline: boolean; error: string | null };
type A =
  | { type: 'STATE'; state: GameState; moves: MoveDTO[]; etag: string | null; offset: number; notice?: string }
  | { type: 'OPTIMISTIC'; uci: string } | { type: 'ROLLBACK' }
  | { type: 'NOTICE'; notice: string } | { type: 'OFFLINE'; offline: boolean } | { type: 'ERROR'; error: string };

const INITIAL: S = { server: null, moves: [], etag: null, offset: 0, optimistic: null, notice: '', offline: false, error: null };
export const PROMO_HINT = 'Falta la pieza de la coronación: escribe g8=D, =T, =A o =C.';
const ERRORS: Record<number, string> = { 400: 'El enlace no es válido.', 403: 'No participas en esta partida.', 404: 'Esta partida no existe.' };

export function reducer(s: S, a: A): S {
  switch (a.type) {
    case 'STATE': return { ...s, server: a.state, moves: a.moves, etag: a.etag, offset: a.offset, optimistic: null, offline: false,
      notice: a.notice ?? (a.state.ply !== s.server?.ply ? '' : s.notice) };
    case 'OPTIMISTIC': return { ...s, optimistic: a.uci, notice: '' };
    case 'ROLLBACK': return { ...s, optimistic: null };
    case 'NOTICE': return { ...s, notice: a.notice };
    case 'OFFLINE': return s.offline === a.offline ? s : { ...s, offline: a.offline };
    case 'ERROR': return { ...s, error: a.error };
  }
}

/** Suma las jugadas nuevas por ply (el servidor repite la última para el jaque) y corta en el ply del estado. */
export const mergeMoves = (prev: MoveDTO[], state: GameState, extra: MoveDTO[] = []) => {
  const byPly = new Map(prev.map(m => [m.ply, m]));
  for (const m of [...state.moves, ...extra]) byPly.set(m.ply, m);
  return [...byPly.values()].filter(m => m.ply <= state.ply).sort((a, b) => a.ply - b.ply);
};

/** Estado de la partida: polling encadenado con ETag, jugada optimista y acciones (tablas, rendirse, cancelar). */
export function useGame(matchId: string) {
  const router = useRouter();
  const [s, dispatch] = useReducer(reducer, INITIAL);
  // copia síncrona de lo último confirmado: el polling y las acciones la leen sin esperar al render
  const live = useRef<{ server: GameState | null; moves: MoveDTO[]; etag: string | null }>({ server: null, moves: [], etag: null });
  const kick = useRef<(full?: boolean) => void>(() => {});
  const withdrew = useRef(false);   // la oferta la quitaste tú: no avisar "rechazó"


  const toLogin = useCallback(() => router.replace(`/login?next=${encodeURIComponent(`/dashboard/arena/${matchId}`)}`), [router, matchId]);

  /** Aplica un estado del servidor; si faltan jugadas en medio, pide el estado completo. */
  const commit = useCallback((state: GameState, etag: string | null, extra?: MoveDTO[]) => {
    const moves = mergeMoves(live.current.moves, state, extra);
    if (moves.length !== state.ply || moves.some((m, i) => m.ply !== i + 1)) { kick.current(true); return; }
    const prev = live.current.server, you = state.yourColor;
    // tu oferta desapareció sin terminar la partida y sin que movieras tú: el rival la rechazó (o jugó encima)
    const declined = prev?.drawOffer === you && state.drawOffer === null && state.status === 'active'
      && (state.ply === prev.ply || state.turn === you) && !withdrew.current;
    if (state.drawOffer === null) withdrew.current = false;
    live.current = { server: state, moves, etag };
    // diferencia entre el reloj del servidor y el tuyo, al recibir
    dispatch({ type: 'STATE', state, moves, etag, offset: Date.parse(state.clock.serverNow) - Date.now(), ...(declined && { notice: `${state.opponent.username} rechazó las tablas.` }) });
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined, fails = 0, gen = 0, full = true;
    const run = async (my: number) => {
      if (my !== gen) return;
      if (document.hidden) { timer = setTimeout(() => run(my), 1000); return; }   // pestaña oculta: en pausa
      try {
        const since = full ? 0 : live.current.moves.length, etag = full ? null : live.current.etag;
        if (full) live.current = { ...live.current, moves: [] };
        const r = await arenaApi.state(matchId, since, etag, ctrl.signal);
        if (my !== gen) return;
        fails = 0; full = false;
        dispatch({ type: 'OFFLINE', offline: false });
        if (r !== 'not-modified') commit(r.state, r.etag);
        if (my !== gen) return;   // commit pidió el estado completo
        const next = live.current.server?.pollAfterMs ?? 1500;
        if (next > 0) timer = setTimeout(() => run(my), next);
      } catch (e) {
        if (ctrl.signal.aborted || my !== gen) return;
        if (e instanceof ApiError && e.status === 401) { toLogin(); return; }
        if (e instanceof ApiError && ERRORS[e.status]) { dispatch({ type: 'ERROR', error: ERRORS[e.status]! }); return; }
        fails++;
        if (fails >= 5) dispatch({ type: 'OFFLINE', offline: true });
        timer = setTimeout(() => run(my), Math.min(15_000, 2000 * 2 ** (fails - 1)));
      }
    };
    kick.current = (f = false) => { full ||= f; clearTimeout(timer); void run(++gen); };
    kick.current(true);
    return () => { ctrl.abort(); clearTimeout(timer); gen++; };
  }, [matchId, commit, toLogin]);

  const reload = useCallback(() => kick.current(true), []);
  const refresh = useCallback(() => kick.current(), []);
  const notice = (n: string) => dispatch({ type: 'NOTICE', notice: n });

  /** Errores comunes de las acciones: 401 al login, 409 recarga, el resto como aviso. */
  const fail = (e: unknown, map: Record<string, string> = {}) => {
    if (!(e instanceof ApiError)) return notice('No se pudo conectar. Reintenta.');
    if (e.status === 401) return toLogin();
    if (map[e.code] !== undefined) { if (map[e.code]) notice(map[e.code]!); return; }
    if (e.status === 409) return reload();
    notice(e.message);
  };

  const server = s.server;
  // con una jugada en vuelo ya no es tu turno
  const yourTurn = !!server && (server.status === 'pending' || server.status === 'active') && server.turn === server.yourColor && !s.optimistic;

  const play = async (uci: string) => {
    const cur = live.current.server;
    if (!cur || !yourTurn) return;   // una jugada en vuelo como máximo
    const ply = cur.ply;
    dispatch({ type: 'OPTIMISTIC', uci });
    try {
      const r = await arenaApi.move(matchId, uci, ply);   // 201
      const expected = livePosition(cur.fen, uci).fen();
      if (!sameBoard(expected, r.state.fen)) {
        console.warn('[arena] posición distinta a la del servidor', { expected, server: r.state.fen });
        dispatch({ type: 'ROLLBACK' });
        return reload();   // manda el servidor
      }
      commit(r.state, null, [r.move]);
    } catch (e) {
      dispatch({ type: 'ROLLBACK' });
      if (!(e instanceof ApiError)) return notice('No se pudo enviar la jugada. Reintenta.');
      if (e.status === 401) return toLogin();
      if (e.code === 'PROMOTION_REQUIRED') return notice(PROMO_HINT);
      if (e.status === 422) return notice('Esa jugada no es legal en esta posición.');
      if (e.code === 'STALE_PLY' || e.code === 'NOT_YOUR_TURN') { notice('La posición cambió.'); return reload(); }
      if (e.code === 'MATCH_FINISHED' || e.code === 'MATCH_ABORTED') return reload();
      notice(e.fields?.uci?.[0] ?? e.message);   // 400: es un bug, el aviso lo deja ver
    }
  };

  const withState = (call: Promise<{ state: GameState }>, map?: Record<string, string>) =>
    call.then(r => commit(r.state, null), e => fail(e, map));

  return {
    ...s, yourTurn, play, reload: refresh,
    resign: () => withState(arenaApi.resign(matchId)),
    offerDraw: () => { notice(''); return withState(arenaApi.offerDraw(matchId)); },
    acceptDraw: () => withState(arenaApi.acceptDraw(matchId), { NO_DRAW_OFFER: 'La oferta ya no está.' }),
    // rechazar o retirar: 204, y en 404 la oferta ya no estaba; en los dos casos se quita la banda
    declineDraw: () => { withdrew.current = true; return arenaApi.declineDraw(matchId).catch(e => fail(e, { NO_DRAW_OFFER: '' })).finally(refresh); },
    cancel: () => arenaApi.cancel(matchId).then(() => router.push(live.current.server?.ai ? '/dashboard/ai' : '/dashboard/play'),
      e => fail(e, { MATCH_NOT_PENDING: 'La partida ya empezó: puedes rendirte.' })),
  };
}
