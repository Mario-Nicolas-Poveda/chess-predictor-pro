import type { TimeControl } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import type { Color, EndReason, MatchStatus } from '../infrastructure/dto/arenaSchemas';

// la fila de matches con el estado de la partida (migración 0004)
export interface MatchRecord {
  id: string; whiteId: string; blackId: string; timeControl: TimeControl; status: MatchStatus; createdAt: Date;
  version: number; ply: number; fen: string; whiteMs: number; blackMs: number; incrementMs: number;
  turnStartedAt: Date | null; startedAt: Date | null; endedAt: Date | null;
  result: Color | 'draw' | null; endReason: EndReason | null; drawOfferBy: Color | null;
  rematchOfferBy: Color | null; rematchOfferedAt: Date | null; rematchId: string | null;
  whiteEloBefore: number | null; blackEloBefore: number | null; whiteEloAfter: number | null; blackEloAfter: number | null;
}

export interface MoveRecord { ply: number; uci: string; san: string; whiteMs: number; blackMs: number; createdAt: Date }

export const turnOf = (ply: number): Color => (ply % 2 === 0 ? 'white' : 'black');
export const other = (c: Color): Color => (c === 'white' ? 'black' : 'white');
export const colorOf = (m: MatchRecord, userId: string): Color | null =>
  m.whiteId === userId ? 'white' : m.blackId === userId ? 'black' : null;
