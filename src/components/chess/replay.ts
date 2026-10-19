import { Chess } from 'chess.js';
import { movePieces, piecesFromFen } from './pieces';
import type { BoardPiece, PieceType, Square } from './types';

export interface Frame {
  pieces: BoardPiece[];                                  // ids estables (wp1, bn2…)
  captured: { white: string[]; black: string[] };        // ids capturados de cada color, en orden
  lastMove: [Square, Square] | null;
  check: Square | null;                                  // casilla del rey en jaque
  san: string | null;                                    // en inglés, como llega de la API
  turn: 'white' | 'black';
}

const toMove = (u: string) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

function kingSquare(g: Chess): Square | null {
  const color = g.turn();
  for (const row of g.board()) for (const c of row) if (c && c.type === 'k' && c.color === color) return c.square as Square;
  return null;
}

/** frames[0] = inicio; frames[n] = tras la jugada n. */
export function framesOf(ucis: string[]): Frame[] {
  const g = new Chess();
  let pieces = piecesFromFen(g.fen());
  const captured = { white: [] as string[], black: [] as string[] };
  const frames: Frame[] = [{ pieces, captured: { white: [], black: [] }, lastMove: null, check: null, san: null, turn: 'white' }];
  for (const u of ucis) {
    const mv = g.move(toMove(u));
    const before = new Set(pieces.map(p => p.id));
    pieces = movePieces(pieces, { from: mv.from as Square, to: mv.to as Square, promotion: mv.promotion as PieceType | undefined });
    const after = new Set(pieces.map(p => p.id));
    before.forEach(id => { if (!after.has(id)) captured[id.startsWith('w') ? 'white' : 'black'].push(id); });
    frames.push({ pieces, captured: { white: [...captured.white], black: [...captured.black] },
      lastMove: [mv.from as Square, mv.to as Square], check: g.inCheck() ? kingSquare(g) : null,
      san: mv.san, turn: g.turn() === 'w' ? 'white' : 'black' });
  }
  return frames;
}
