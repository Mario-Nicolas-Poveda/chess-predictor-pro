'use client';
import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { EtagPoller, type PollView } from '@/lib/etagPoller';
import { realtimeClient } from '@/lib/realtime';
import type { TournamentDetail } from '@/modules/tournaments/infrastructure/dto/tournamentSchemas';
import { tournamentsApi } from '../api/tournamentsApi';
import { afterDeadline } from '../lib/deadline';

/** Timbre del torneo (0009): canal público "tournament:<id>". Es solo un aviso: al oírlo se consulta con ETag. */
export function onTournamentBell(id: string, ring: () => void): () => void {
  const p = realtimeClient();
  if (!p) return () => {};                                    // sin variables: solo la consulta de respaldo
  let alive = true, ch: RealtimeChannel | null = null;
  void p.then(sb => { if (alive) ch = sb.channel(`tournament:${id}`).on('broadcast', { event: 'state' }, ring).subscribe(); });
  return () => { alive = false; if (ch) { const c = ch; void p.then(sb => sb.removeChannel(c)); } };
}

/** Las horas en las que algo cambia en el servidor: el inicio y los plazos de primera jugada. */
export const deadlinesOf = (d: TournamentDetail | null): string[] =>
  !d ? [] : [...(d.status === 'open' ? [d.startsAt] : []), ...d.rounds.flatMap(r => r.games.flatMap(g => (g.deadline ? [g.deadline] : [])))];

/**
 * La llave en vivo: ETag + timbre + consulta de respaldo (pollAfterMs) + consulta justo al vencer un plazo.
 * En pausa con la pestaña oculta. `skewMs` corrige las cuentas atrás con la hora del servidor.
 */
export function useTournament(id: string | null) {   // null: id inválido, no se consulta
  const [view, setView] = useState<PollView<TournamentDetail>>({ data: null, loading: true, problem: null });
  const [skewMs, setSkewMs] = useState(0);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);   // para "las llaves de hace N min"
  const latest = useRef<TournamentDetail | null>(null);
  const poller = useRef<EtagPoller<TournamentDetail> | null>(null);

  useEffect(() => {
    if (!id) return;
    const p = new EtagPoller<TournamentDetail>({
      fetch: async (etag, signal) => {
        const r = await tournamentsApi.detail(id, etag, signal);
        if (r.kind === 'data' && r.serverNow) setSkewMs(Date.parse(r.serverNow) - Date.now());
        return r;
      },
      pollAfter: d => d.pollAfterMs,
      onChange: v => { latest.current = v.data; setView(v); if (!v.problem) setLoadedAt(Date.now()); },
    });
    poller.current = p;
    p.start();
    const off = onTournamentBell(id, () => void p.refresh());
    const onVis = () => p.setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => { p.stop(); off(); document.removeEventListener('visibilitychange', onVis); poller.current = null; };
  }, [id]);

  const key = deadlinesOf(view.data).join('|');
  useEffect(() => {
    if (!key) return;
    const cancels = key.split('|').map(at => afterDeadline({
      at, skewMs,
      refresh: async () => { await poller.current?.refresh(); return !deadlinesOf(latest.current).includes(at); },
    }));
    return () => cancels.forEach(c => c());
  }, [key, skewMs]);

  return { ...view, skewMs, loadedAt, refresh: () => void poller.current?.refresh() };
}
