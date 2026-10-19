'use client';

import { useEffect, useState } from 'react';
import { arenaApi } from '@/modules/arena/presentation/api/arenaApi';
import { dayLabel } from '@/modules/arena/presentation/reasons';
import type { EloPoint } from '../components/EloChart';
import type { GameResult } from '../components/ResultsStrip';

/** Evolución de ELO (30 días) y últimas partidas para el perfil. Si falla, el perfil sigue con los estados vacíos. */
export function useProfileHistory() {
  const [data, setData] = useState<{ history: EloPoint[]; results: GameResult[] }>({ history: [], results: [] });
  useEffect(() => {
    let alive = true;
    arenaApi.profileHistory(30).then(h => {
      if (!alive) return;
      const now = Date.now();
      // la API manda las partidas de la más nueva a la más vieja; la tira va de la más vieja a hoy
      setData({ history: h.elo, results: h.results.map(r => ({ id: r.id, result: r.outcome, opponent: r.opponent, date: dayLabel(r.endedAt, now) })).reverse() });
    }, () => {});
    return () => { alive = false; };
  }, []);
  return data;
}
