import { z } from 'zod';
import type { PlayerSummary } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';

/** Partidas con ELO entre personas que hacen falta para aparecer en el ranking. */
export const MIN_RANKED_GAMES = 5;

const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const RankingQuerySchema = z.object({
  sort: z.enum(['elo', 'wins'], { error: 'Debe ser elo o wins' }).default('elo'),
  q: z.preprocess(blankToUndefined, z.string().trim().max(30, { error: 'Máximo 30 caracteres' }).optional()),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
}).strict();
export type RankingQuery = z.infer<typeof RankingQuerySchema>;

export type GameOutcome = 'win' | 'draw' | 'loss';

export interface RankingRow {
  rank: number;                    // puesto con el orden pedido (no cambia al buscar)
  player: PlayerSummary;
  games: number; wins: number; draws: number; losses: number;
  winRate: number;                 // 0 a 100, redondeado
  last5: GameOutcome[];            // de la más reciente a la más vieja
}

export interface RankingPage {
  sort: 'elo' | 'wins';
  q: string | null;
  players: number;                 // cuántos aparecen en el ranking (sin buscar)
  total: number;                   // cuántos cumplen la búsqueda (para "Mostrar más")
  offset: number;
  limit: number;
  items: RankingRow[];
  you: { row: RankingRow | null; games: number; needed: number };   // row null → aún no apareces (games de needed)
}
