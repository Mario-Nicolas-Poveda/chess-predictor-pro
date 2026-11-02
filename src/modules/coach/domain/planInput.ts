import { MOTIF_ES, PHASE_ES } from './coachInput';
import type { Motif, Phase } from './types';

/** Lo que el plan necesita del historial (ya agregado; sin nombres ni correos). */
export interface PlanStats {
  games: number;
  accuracyAvg: number;
  accuracyFirstHalf: number;     // media de las partidas más viejas de la ventana
  accuracySecondHalf: number;    // media de las más nuevas
  blundersPerGame: number;
  errorsByPhase: Record<Phase, number>;
  topMotifs: { motif: Motif; count: number }[];
  openings: { name: string; color: 'white' | 'black'; games: number; wins: number; draws: number; losses: number }[];
  results: { wins: number; draws: number; losses: number; timeouts: number };
  yourElo: number;
}

export function buildPlanInput(s: PlanStats) {
  const worst = (Object.entries(s.errorsByPhase) as [Phase, number][]).sort((a, b) => b[1] - a[1])[0];
  return {
    idioma: 'español',
    eloAproximado: s.yourElo,
    partidasAnalizadas: s.games,
    precisionMedia: s.accuracyAvg,
    tendencia: s.accuracySecondHalf - s.accuracyFirstHalf >= 3 ? 'mejorando'
      : s.accuracyFirstHalf - s.accuracySecondHalf >= 3 ? 'empeorando' : 'estable',
    erroresGravesPorPartida: Math.round(s.blundersPerGame * 10) / 10,
    faseConMasErrores: worst && worst[1] > 0 ? PHASE_ES[worst[0]] : null,
    motivosFrecuentes: s.topMotifs.slice(0, 4).map(m => ({ motivo: MOTIF_ES[m.motif], veces: m.count })),
    aperturas: s.openings.slice(0, 5).map(o => ({
      apertura: o.name, color: o.color === 'white' ? 'blancas' : 'negras', partidas: o.games, victorias: o.wins, tablas: o.draws, derrotas: o.losses,
    })),
    resultados: { victorias: s.results.wins, tablas: s.results.draws, derrotas: s.results.losses, perdidasPorTiempo: s.results.timeouts },
  };
}
export type PlanInput = ReturnType<typeof buildPlanInput>;
