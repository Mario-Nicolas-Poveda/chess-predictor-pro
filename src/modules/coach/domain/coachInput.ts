import type { Color, MatchAnalysis, Motif, Phase } from './types';
import { keyMoments } from './analyseMatch';
import { moveLabel } from './notation';

const CLASS_ES = { best: 'la mejor', good: 'buena', inaccuracy: 'imprecisión', mistake: 'error', blunder: 'error grave' } as const;
export const PHASE_ES: Record<Phase, string> = { opening: 'apertura', middlegame: 'medio juego', endgame: 'final' };
const PIECE_ES = { p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama' } as const;
export const MOTIF_ES: Record<Motif, string> = {
  hanging_piece: 'dejó una pieza sin defensa',
  missed_capture: 'no capturó una pieza que se podía ganar',
  missed_mate: 'tenía mate y no lo dio',
  allowed_mate: 'permitió un mate',
  early_queen: 'sacó la dama muy pronto',
  no_castle: 'no enrocó a tiempo',
  undeveloped: 'tardó en sacar las piezas menores',
  time_trouble: 'se quedó sin tiempo',
};

export interface HistoryFacts {
  games: number;                 // partidas analizadas antes de esta (máx. 10)
  accuracyAvg: number | null;
  blundersPerGame: number | null;
  topMotif: Motif | null;
  worstPhase: Phase | null;
  streak: string | null;         // "3 derrotas seguidas", "2 victorias seguidas"
}

export interface GameMeta {
  result: 'win' | 'loss' | 'draw';
  reason: string;                // checkmate, resign, timeout…
  opponent: 'ai' | 'human';
  aiLevelName?: string;          // "Alfil"
  opponentElo: number | null;
  timeControl: string;           // '10+0', 'none'…
  yourElo: number;
}

/**
 * Hechos para el modelo. Solo datos de ajedrez: ni nombres, ni correos, ni texto escrito por usuarios
 * (así no hay datos personales ni texto que intente cambiar las instrucciones del modelo).
 */
export function buildCoachInput(a: MatchAnalysis, you: Color, meta: GameMeta, history: HistoryFacts) {
  const mine = a.moves.filter(m => m.color === you);
  const side = a[you], rival = a[you === 'white' ? 'black' : 'white'];
  const mistakes = mine.filter(m => m.class === 'blunder' || m.class === 'mistake' || m.class === 'inaccuracy')
    .sort((x, y) => y.winLoss - x.winLoss).slice(0, 6);
  return {
    idioma: 'español',
    jugador: {
      color: you === 'white' ? 'blancas' : 'negras',
      eloAproximado: meta.yourElo,
      resultado: { win: 'victoria', loss: 'derrota', draw: 'tablas' }[meta.result],
      motivoDelFinal: meta.reason,
      rival: meta.opponent === 'ai' ? `IA nivel ${meta.aiLevelName}` : `persona con ELO ${meta.opponentElo ?? 'desconocido'}`,
      ritmo: meta.timeControl === 'none' ? 'sin reloj' : meta.timeControl,
    },
    partida: {
      jugadas: Math.ceil(a.plies / 2),
      apertura: a.opening,
      precision: { tuya: side.accuracy, rival: rival.accuracy },
      conteo: side.counts,
      erroresPorFase: Object.fromEntries(Object.entries(side.errorsByPhase).map(([k, v]) => [PHASE_ES[k as Phase], v])),
    },
    errores: mistakes.map(m => ({
      ply: m.ply,
      jugada: moveLabel(m),
      tipo: CLASS_ES[m.class],
      puntosPerdidos: Math.round(m.winLoss),
      mejor: m.best ? moveLabel({ ply: m.ply, san: m.best.san }) : null,
      fase: PHASE_ES[m.phase],
      motivo: m.motif ? MOTIF_ES[m.motif] + (m.piece ? ` (${PIECE_ES[m.piece]})` : '') : null,
    })),
    habitos: Object.entries(side.motifs).filter(([k]) => ['early_queen', 'no_castle', 'undeveloped', 'time_trouble'].includes(k))
      .map(([k]) => MOTIF_ES[k as Motif]),
    historial: history.games ? {
      partidasAnalizadas: history.games,
      precisionMedia: history.accuracyAvg,
      erroresGravesPorPartida: history.blundersPerGame,
      motivoMasFrecuente: history.topMotif ? MOTIF_ES[history.topMotif] : null,
      faseConMasErrores: history.worstPhase ? PHASE_ES[history.worstPhase] : null,
      racha: history.streak,
    } : null,
    momentosClave: keyMoments(a, you).map(m => m.ply),
  };
}
export type CoachInput = ReturnType<typeof buildCoachInput>;
