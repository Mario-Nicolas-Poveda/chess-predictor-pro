// Contrato compartido con el front: solo zod, sin imports de servidor
import { z } from 'zod';
import type { PlayerSummary, TimeControl } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';

export const UciSchema = z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/, { error: 'Jugada en formato UCI, por ejemplo e2e4 o e7e8q' });
export const MakeMoveSchema = z.object({ uci: UciSchema, ply: z.int().min(0) }).strict();
export type MakeMoveInput = z.infer<typeof MakeMoveSchema>;
export const StateQuerySchema = z.object({ since: z.coerce.number().int().min(0).default(0) });
export const MoveParamsSchema = z.object({ id: z.uuid({ error: 'Debe ser un UUID' }), ply: z.coerce.number().int().min(1, { error: 'Debe ser 1 o más' }) });
export const HistoryQuerySchema = z.object({
  result: z.enum(['win', 'loss', 'draw']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z.iso.datetime({ offset: true }).optional(),
});
export type HistoryQuery = z.infer<typeof HistoryQuerySchema>;
export const ProfileHistoryQuerySchema = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) });

export type Color = 'white' | 'black';
export type MatchStatus = 'pending' | 'active' | 'finished' | 'aborted';
export type EndReason = 'checkmate' | 'resign' | 'timeout' | 'agreement' | 'stalemate' | 'insufficient' | 'threefold' | 'fifty';

export interface MoveDTO { ply: number; uci: string; san: string; whiteMs: number; blackMs: number; at: string }
export interface EloChange { before: number; after: number }

export interface GameState {
  id: string;
  status: MatchStatus;
  version: number;
  timeControl: TimeControl;
  yourColor: Color;
  ply: number;
  turn: Color;
  fen: string;
  check: boolean;
  moves: MoveDTO[];                        // solo las de ply > since
  clock: { whiteMs: number; blackMs: number; incrementMs: number; running: Color | null; turnStartedAt: string | null; serverNow: string };
  drawOffer: Color | null;
  pendingExpiresAt: string | null;         // solo en 'pending'
  startedAt: string | null;
  endedAt: string | null;
  result: { winner: Color | null; reason: EndReason; elo: { white: EloChange; black: EloChange } } | null;
  rematch: { offeredBy: Color | null; matchId: string | null } | null;   // solo en 'finished'
  you: PlayerSummary;
  opponent: PlayerSummary;
  pollAfterMs: number;                     // 0 = no hace falta seguir consultando
}

export interface MatchListItem {
  id: string; timeControl: TimeControl; endedAt: string; yourColor: Color;
  outcome: 'win' | 'loss' | 'draw'; reason: EndReason; eloDelta: number; plies: number;
  opponent: PlayerSummary;                 // elo = el que tenía en esa partida
}

export interface ProfileHistory {
  elo: { date: string; elo: number }[];    // 'YYYY-MM-DD', hora de Bogotá
  results: { id: string; outcome: 'win' | 'loss' | 'draw'; opponent: string; endedAt: string }[];   // últimas 34, de la más nueva a la más vieja
}

export const POLL_MS = { pending: 1500, yourTurn: 3000, theirTurn: 1000, finished: 0 } as const;
