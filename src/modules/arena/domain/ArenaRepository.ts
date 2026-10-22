import type { TimeControl } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import type { Color, EndReason } from '../infrastructure/dto/arenaSchemas';
import type { Outcome } from './GameRules';
import type { MatchRecord, MoveRecord } from './Match';

export interface CommitMove {
  matchId: string; expectedPly: number; mover: Color; uci: string; san: string; fen: string;
  whiteMs: number; blackMs: number; outcome: Outcome | null;
}

// lo que depende del estado se escribe en una función SQL con for update o con la condición en el UPDATE
export interface ArenaRepository {
  settle(id: string): Promise<void>;                                   // aplica el tiempo: cancela pending viejas, cierra por tiempo
  findMatch(id: string): Promise<MatchRecord | null>;
  listMoves(id: string, sincePly?: number): Promise<MoveRecord[]>;     // ply > sincePly, en orden
  findMove(id: string, ply: number): Promise<MoveRecord | null>;
  commitMove(c: CommitMove): Promise<number>;                          // el ply nuevo; STALE_PLY si alguien jugó antes
  finish(id: string, result: Color | 'draw', reason: EndReason): Promise<void>;   // ELO incluido; si ya terminó, nada
  offerDraw(id: string, by: Color): Promise<boolean>;                  // false si ya hay oferta o no está active
  clearDrawOffer(id: string): Promise<boolean>;                        // false si no había oferta
  acceptDraw(id: string, by: Color): Promise<void>;                    // NO_DRAW_OFFER, OWN_DRAW_OFFER o MATCH_NOT_ACTIVE
  botIds(ids: string[]): Promise<string[]>;                            // los que son bots (users.is_bot)
  history(userId: string, outcome: Outcome3 | null, before: string | null, limit: number, rated?: boolean): Promise<HistoryRow[]>;   // terminadas, la más nueva primero
  eloSeries(userId: string, days: number): Promise<{ date: string; elo: number }[]>;
  rematch(id: string, by: Color): Promise<string | null>;              // null = ofrecida; id = creada (arena_rematch)
  cancelRematch(id: string): Promise<boolean>;                         // false si no había oferta pendiente
}

export type Outcome3 = 'win' | 'loss' | 'draw';
export interface HistoryRow {
  id: string; timeControl: TimeControl | 'none'; endedAt: Date; yourColor: Color; outcome: Outcome3; reason: EndReason;
  eloDelta: number; plies: number; opponentId: string; opponentElo: number; rated: boolean;
}
