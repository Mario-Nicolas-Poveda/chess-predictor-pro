'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { framesOf } from '@/components/chess/replay';
import { ApiError } from '@/lib/apiClient';
import type { GameState } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { arenaApi } from '../api/arenaApi';

const STEP_MS = 950;

/**
 * Repetición: carga la partida entera y recorre sus fotos. `ply` empieza al final; reproducir avanza cada 950 ms.
 * `initial`: el estado que llegó en el HTML (#171); entonces no se consulta (una partida terminada no cambia).
 */
export function useReplay(matchId: string, initial?: GameState) {
  const router = useRouter();
  const [state, setState] = useState<GameState | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [ply, setPly] = useState(initial?.moves.length ?? 0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (initial) return;
    const ctrl = new AbortController();
    arenaApi.state(matchId, 0, null, ctrl.signal).then(r => {
      if (r === 'not-modified') return;
      setState(r.state); setPly(r.state.moves.length); setPlaying(false);
    }, e => {
      if (ctrl.signal.aborted) return;
      if (e instanceof ApiError && e.status === 401) { router.replace(`/login?next=${encodeURIComponent(`/dashboard/partidas/${matchId}`)}`); return; }
      setError(e instanceof ApiError && e.status === 403 ? 'No participas en esta partida.' : e instanceof ApiError && e.status < 500 ? 'Esta partida no existe.' : 'No pudimos cargar la partida.');
    });
    return () => ctrl.abort();
  }, [matchId, router, initial]);

  const frames = useMemo(() => framesOf(state ? state.moves.map(m => m.uci) : []), [state]);
  const last = frames.length - 1;

  useEffect(() => {
    if (!playing || ply >= last) return;
    // se para al llegar al final
    const t = setTimeout(() => { setPly(ply + 1); if (ply + 1 >= last) setPlaying(false); }, STEP_MS);
    return () => clearTimeout(t);
  }, [playing, ply, last]);

  const go = (p: number) => { setPlaying(false); setPly(Math.max(0, Math.min(last, p))); };
  return {
    state, error, frames, ply, last, playing, go,
    // si ya estaba al final, empieza desde 0
    toggle: () => { if (playing) return setPlaying(false); if (ply >= last) setPly(0); setPlaying(true); },
  };
}
