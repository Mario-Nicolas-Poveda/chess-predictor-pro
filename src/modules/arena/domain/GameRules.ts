import type { Color, EndReason } from '../infrastructure/dto/arenaSchemas';

export type Outcome = { result: Color | 'draw'; reason: EndReason };

export interface PlayResult { san: string; fen: string; check: boolean; outcome: Outcome | null }

// el dominio no conoce chess.js: la implementación es infrastructure/ChessJsRules
export interface GameRules {
  play(history: string[], next: string): PlayResult;   // repite history (uci) desde el inicio y aplica next; IllegalMoveError si no es legal
  legalMoves(history: string[]): string[];             // jugadas legales (uci) tras history
  sanAt(fen: string, uci: string): string;             // SAN (inglés) de uci en la posición fen; IllegalMoveError si no es legal
  isValidFen(fen: string): boolean;                    // false si no es una posición posible (sin reyes, peones en la 1.ª…)
}
