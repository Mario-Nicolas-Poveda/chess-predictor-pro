import { z } from 'zod';
import { MOTIFS, MOVE_CLASSES, TIP_CATEGORIES, type Motif, type MoveClass, type SummaryStats, type TipCategory } from '../../domain/types';

/** Contratos del AI Coach. Solo zod y tipos puros: lo importan el servidor y el navegador. */
export { MOTIFS, MOVE_CLASSES, TIP_CATEGORIES };
export type { Motif, MoveClass, SummaryStats, TipCategory };

/** Lo que debe devolver el modelo (y también el escritor por plantillas). Se valida SIEMPRE. */
export const CoachAdviceSchema = z.object({
  summary: z.string().trim().min(20).max(420),
  tips: z.array(z.object({
    title: z.string().trim().min(4).max(80),
    body: z.string().trim().min(20).max(360),
    category: z.enum(TIP_CATEGORIES),
    plies: z.array(z.int().min(1)).max(3).default([]),
  })).min(1).max(3),
  drill: z.string().trim().min(10).max(260),
});
export type CoachAdvice = z.infer<typeof CoachAdviceSchema>;

/** Plan de entrenamiento a partir del historial. */
export const CoachPlanSchema = z.object({
  headline: z.string().trim().min(10).max(160),
  focus: z.array(z.object({
    title: z.string().trim().min(4).max(80),
    body: z.string().trim().min(20).max(360),
    category: z.enum(TIP_CATEGORIES),
  })).min(1).max(3),
  drill: z.string().trim().min(10).max(260),
});
export type CoachPlan = z.infer<typeof CoachPlanSchema>;

export type ReviewStatus = 'pending' | 'ready' | 'failed';
export type CoachSource = 'llm' | 'template';

export interface ReviewMoveDTO {
  ply: number; color: 'white' | 'black'; uci: string; san: string; class: MoveClass;
  winLoss: number;                          // puntos de probabilidad perdidos (0–100)
  winWhiteAfter: number;                    // probabilidad de que ganen las blancas tras la jugada (0–100)
  best: { uci: string; san: string } | null;   // null = jugaste la mejor
  motif: Motif | null;
}
export interface SideStatsDTO { accuracy: number; counts: Record<MoveClass, number> }

export interface GameReviewDTO {
  matchId: string;
  status: ReviewStatus;
  version: number;
  pollAfterMs: number;                      // 0 = no hace falta seguir consultando
  yourColor: 'white' | 'black';
  analysis: {                               // solo con status 'ready'
    opening: string | null;
    winWhite: number[];                     // una por ply, desde la posición inicial (largo = jugadas + 1)
    moves: ReviewMoveDTO[];
    white: SideStatsDTO;
    black: SideStatsDTO;
    keyMoments: number[];                   // plies de tus jugadas más caras (máx. 3), en orden
  } | null;
  coach: (CoachAdvice & { source: CoachSource; model: string | null }) | null;
  error: string | null;                     // solo en 'failed'
  updatedAt: string;
}

export interface CoachSummaryDTO {
  status: ReviewStatus;
  version: number;
  pollAfterMs: number;
  stale: boolean;                           // hay partidas analizadas después de este plan: conviene pedir otro
  basedOn: number;                          // cuántas partidas analizadas usa
  stats: SummaryStats | null;               // mientras se rehace ('pending') llega el anterior, si había
  plan: (CoachPlan & { source: CoachSource; model: string | null }) | null;
  error: string | null;
  updatedAt: string;
}

/** Lo que suma cada item de GET /matches. null = la partida no tiene análisis. */
export interface ReviewBadge { status: ReviewStatus; accuracy: number | null }

export const MIN_PLIES_FOR_REVIEW = 6;
export const MIN_GAMES_FOR_PLAN = 3;
export const REVIEW_POLL_MS = 1500;
