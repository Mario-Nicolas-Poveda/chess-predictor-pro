/** Tipos del análisis de una partida. Sin dependencias: lo usan el servidor y los tests. */
export type Color = 'white' | 'black';
export const MOVE_CLASSES = ['best', 'good', 'inaccuracy', 'mistake', 'blunder'] as const;
export type MoveClass = (typeof MOVE_CLASSES)[number];
export type Phase = 'opening' | 'middlegame' | 'endgame';
export const MOTIFS = [
  'hanging_piece',     // tras tu jugada, el rival gana material con una captura
  'missed_capture',    // había una captura que ganaba material y no la hiciste
  'missed_mate',       // tenías mate y no lo diste
  'allowed_mate',      // tu jugada permite que el rival dé mate
  'early_queen',       // sacaste la dama en las primeras 5 jugadas
  'no_castle',         // en la jugada 15 tu rey seguía en el centro sin enrocar
  'undeveloped',       // en la jugada 10 seguías con 2 o más piezas menores en su casilla inicial
  'time_trouble',      // perdiste por tiempo o jugaste las últimas 10 con menos del 10 % del reloj
] as const;
export type Motif = (typeof MOTIFS)[number];
export const TIP_CATEGORIES = ['opening', 'tactics', 'strategy', 'endgame', 'time', 'mindset'] as const;
export type TipCategory = (typeof TIP_CATEGORIES)[number];

export interface PlayedMove { ply: number; uci: string; san: string; fenBefore: string; msLeft: number | null }

export interface MoveReview {
  ply: number; color: Color; uci: string; san: string;
  class: MoveClass;
  winLoss: number;                  // puntos de probabilidad de ganar que perdiste con la jugada (0–100)
  winWhiteAfter: number;            // probabilidad de que ganen las blancas tras la jugada (0–100)
  best: { uci: string; san: string } | null;   // null si jugaste la mejor
  phase: Phase;
  motif: Motif | null;              // solo los motivos de una jugada concreta
  piece: 'p' | 'n' | 'b' | 'r' | 'q' | null;   // pieza que quedó colgando o que se podía capturar
}

export interface SideSummary {
  accuracy: number;                                   // 0–100
  counts: Record<MoveClass, number>;
  errorsByPhase: Record<Phase, number>;               // imprecisiones + errores + errores graves
  motifs: Partial<Record<Motif, number>>;
}

export interface MatchAnalysis {
  version: 1;
  depth: number;
  plies: number;
  opening: string | null;
  winWhite: number[];               // probabilidad de que ganen las blancas en cada ply (0 = inicio)
  moves: MoveReview[];
  white: SideSummary;
  black: SideSummary;
}

/** Estadísticas del plan (lo que se guarda en coach_summaries.stats y ve el usuario). */
export interface SummaryStats {
  games: number;
  accuracyAvg: number;
  accuracyTrend: { matchId: string; endedAt: string; accuracy: number }[];   // de la más vieja a la más nueva
  blundersPerGame: number;
  errorsByPhase: Record<Phase, number>;
  topMotifs: { motif: Motif; count: number; lastMatchId: string }[];         // lastMatchId: la partida más reciente donde pasó
  openings: { name: string; color: Color; games: number; wins: number; draws: number; losses: number }[];
}
