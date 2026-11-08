'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '@/lib/apiClient';
import { EtagPoller, type PollView } from '@/lib/etagPoller';
import type { TournamentListResponse, TournamentSummary } from '@/modules/tournaments/infrastructure/dto/tournamentSchemas';
import { tournamentsApi } from '../api/tournamentsApi';
import { afterDeadline } from '../lib/deadline';

export type CardMsg = { text: string; bad: boolean };
export interface CardUi { busy?: 'join' | 'leave'; ask?: boolean; msg?: CardMsg; closed?: boolean }

const OFFLINE = 'Sin conexión. Reintenta en un momento.';
const minutes = (e: ApiError) => Math.max(1, Math.ceil(Number(e.meta?.retryAfterS ?? 60) / 60));

/** Qué decir cuando falla inscribirse. `closed`: la tarjeta pasa a "Ver llaves". */
export function joinError(e: unknown): CardMsg & { closed?: boolean } {
  if (!(e instanceof ApiError)) return { text: OFFLINE, bad: true };
  if (e.code === 'TOURNAMENT_FULL') return { text: 'Se llenó mientras te inscribías.', bad: true };
  if (e.code === 'TOURNAMENT_CLOSED') return { text: 'Las inscripciones ya cerraron: el torneo empezó.', bad: true, closed: true };
  if (e.status === 429) return { text: `Demasiados intentos. Prueba en ${minutes(e)} min.`, bad: true };
  return { text: e.message, bad: true };
}

export function leaveError(e: unknown): CardMsg & { closed?: boolean } {
  if (!(e instanceof ApiError)) return { text: OFFLINE, bad: true };
  if (e.code === 'TOURNAMENT_CLOSED') return { text: 'El torneo ya empezó: no puedes salir.', bad: true, closed: true };
  return { text: e.message, bad: true };
}

/** La lista de torneos: el servidor decide (EtagPoller con pollAfterMs); a la hora de un plazo, consulta ya. */
export function useTournamentList() {
  const [view, setView] = useState<PollView<TournamentListResponse>>({ data: null, loading: true, problem: null });
  const [ui, setUi] = useState<Record<string, CardUi>>({});
  const [skew, setSkew] = useState(0);                     // hora del servidor − hora del navegador
  const last = useRef<TournamentListResponse | null>(null);

  const poller = useRef<EtagPoller<TournamentListResponse> | null>(null);

  useEffect(() => {
    const p = new EtagPoller<TournamentListResponse>({
      fetch: async (etag, signal) => {
        const r = await tournamentsApi.list(etag, signal);
        if (r.kind === 'data' && r.serverNow) setSkew(Date.parse(r.serverNow) - Date.now());
        return r;
      },
      pollAfter: d => d.pollAfterMs,
      onChange: v => { last.current = v.data; setView(v); },
    });
    poller.current = p;
    p.start();
    const onVis = () => p.setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); p.stop(); poller.current = null; };
  }, []);

  // plazos que importan: tu partida y el inicio de los torneos donde estás inscrito
  const data = view.data;
  const deadlines = useMemo(() => [
    data?.next?.deadline,
    ...(data?.tournaments ?? []).filter(t => t.status === 'open' && t.joined).map(t => t.startsAt),
  ].filter((x): x is string => !!x).sort().join(','), [data]);
  useEffect(() => {
    if (!deadlines) return;
    const stops = deadlines.split(',').map(at => afterDeadline({
      at, skewMs: skew,
      refresh: async () => { const before = last.current; await poller.current?.refresh(); return last.current !== before; },
    }));
    return () => stops.forEach(s => s());
  }, [deadlines, skew]);

  const patch = useCallback((id: string, p: CardUi) => setUi(u => ({ ...u, [id]: { ...u[id], ...p } })), []);
  const put = (t: TournamentSummary) => {
    const cur = last.current;
    if (cur) poller.current?.replace({ ...cur, tournaments: cur.tournaments.map(x => (x.id === t.id ? t : x)) });
  };

  const join = async (id: string) => {
    if (ui[id]?.busy) return;
    patch(id, { busy: 'join', msg: undefined });
    try {
      const r = await tournamentsApi.join(id);
      put(r.tournament);
      patch(id, { busy: undefined, msg: { text: 'Listo: estás inscrito. Te avisamos cuando empiece.', bad: false } });
    } catch (e) {
      const m = joinError(e);
      patch(id, { busy: undefined, msg: { text: m.text, bad: true }, closed: m.closed });
    }
    void poller.current?.refresh();
  };

  const leave = async (id: string) => {
    patch(id, { busy: 'leave', ask: false, msg: undefined });
    try {
      await tournamentsApi.leave(id);
      const t = last.current?.tournaments.find(x => x.id === id);
      if (t) put({ ...t, joined: false, players: Math.max(0, t.players - 1) });
      patch(id, { busy: undefined, msg: { text: 'Saliste del torneo.', bad: false } });
    } catch (e) {
      const m = leaveError(e);
      patch(id, { busy: undefined, msg: { text: m.text, bad: true }, closed: m.closed });
    }
    void poller.current?.refresh();
  };

  const ask = (id: string, on: boolean) => patch(id, { ask: on, msg: undefined });

  return { view, ui, skew, join, leave, ask, retry: () => void poller.current?.refresh() };
}
