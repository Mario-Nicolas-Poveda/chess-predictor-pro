// Contrato compartido con el front (Contra la IA): solo zod, sin imports de servidor
import { z } from 'zod';

export const AI_LEVEL_IDS = [1, 2, 3, 4, 5] as const;
export type AiLevel = (typeof AI_LEVEL_IDS)[number];
export const AiLevelSchema = z.literal(AI_LEVEL_IDS, { error: 'El nivel va de 1 a 5' });

export const AI_TIME_CONTROLS = ['none', '10+0', '5+0'] as const;
export type AiTimeControl = (typeof AI_TIME_CONTROLS)[number];

export const CreateAiGameSchema = z.object({
  level: AiLevelSchema,
  color: z.enum(['white', 'black', 'random']).default('white'),
  timeControl: z.enum(AI_TIME_CONTROLS).default('none'),
  prediction: z.boolean().default(true),
}).strict();
export type CreateAiGameInput = z.infer<typeof CreateAiGameSchema>;

/** FEN completo: piezas, turno, enroques, al paso, medio movimientos y número de jugada. */
export const FenSchema = z.string().trim().regex(
  /^([pnbrqkPNBRQK1-8]{1,8}\/){7}[pnbrqkPNBRQK1-8]{1,8} [wb] (-|K?Q?k?q?) (-|[a-h][36]) \d{1,3} \d{1,4}$/,
  { error: 'FEN no válido' });
export const AiMoveSchema = z.object({ fen: FenSchema, level: AiLevelSchema }).strict();
export const TakebackQuerySchema = z.object({ ply: z.coerce.number().int().min(1, { error: 'Debe ser 1 o más' }) });

export interface AiLevelInfo {
  level: AiLevel;
  name: 'Peón' | 'Caballo' | 'Alfil' | 'Torre' | 'Dama';
  piece: 'p' | 'n' | 'b' | 'r' | 'q';
  elo: number;                 // ELO aproximado (de referencia: contra la IA no cambia el tuyo)
  description: string;
  depth: number;
  thinkMs: number;
}
export const AI_LEVELS: readonly AiLevelInfo[] = [
  { level: 1, name: 'Peón',    piece: 'p', elo: 800,  depth: 1, thinkMs: 250,  description: 'Mueve rápido y deja piezas colgando.' },
  { level: 2, name: 'Caballo', piece: 'n', elo: 1100, depth: 2, thinkMs: 400,  description: 'Mira dos jugadas: ve tus amenazas directas.' },
  { level: 3, name: 'Alfil',   piece: 'b', elo: 1400, depth: 2, thinkMs: 600,  description: 'No deja capturas a medias: sigue los cambios hasta el final.' },
  { level: 4, name: 'Torre',   piece: 'r', elo: 1700, depth: 3, thinkMs: 900,  description: 'Calcula tres jugadas y ordena sus ideas.' },
  { level: 5, name: 'Dama',    piece: 'q', elo: 2000, depth: 4, thinkMs: 1400, description: 'Profundiza mientras tenga tiempo. No regala nada.' },
];

/** El nivel con el ELO más cercano al del jugador. */
export const recommendedLevel = (elo: number): AiLevel =>
  AI_LEVELS.reduce((best, l) => (Math.abs(l.elo - elo) < Math.abs(best.elo - elo) ? l : best)).level;

export interface AiLevelsResponse { levels: AiLevelInfo[]; recommended: AiLevel; activeGame: { matchId: string; level: AiLevel } | null }
export interface AiMoveResult { uci: string; san: string; score: number; depth: number; nodes: number; ms: number }
export interface Prediction { ply: number; white: number; top: { uci: string; san: string; pct: number }[]; depth: number }
