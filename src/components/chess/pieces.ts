import { Chess } from 'chess.js';
import type { BoardPiece, MoveLike, Square } from './types';

/** Piezas con id estable ('wn1', 'bp3'…) para que la escena las mueva en vez de borrarlas y crearlas. */
export function piecesFromFen(fen: string): BoardPiece[] {
  const out: BoardPiece[] = [];
  const count: Record<string, number> = {};
  new Chess(fen).board().forEach(row => row.forEach(cell => {
    if (!cell) return;
    const key = cell.color + cell.type;
    count[key] = (count[key] ?? 0) + 1;
    out.push({ id: `${key}${count[key]}`, type: cell.type, color: cell.color, square: cell.square as Square });
  }));
  return out;
}

/** Aplica una jugada YA validada por chess.js a la lista de piezas, conservando ids. */
export function movePieces(pieces: BoardPiece[], mv: MoveLike): BoardPiece[] {
  const mover = pieces.find(p => p.square === mv.from);
  if (!mover) return pieces;
  const fileDiff = mv.to.charCodeAt(0) - mv.from.charCodeAt(0);
  const isCastle = mover.type === 'k' && Math.abs(fileDiff) === 2;
  const targetOccupied = pieces.some(p => p.square === mv.to);
  const isEnPassant = mover.type === 'p' && fileDiff !== 0 && !targetOccupied;
  const capturedSq = isEnPassant ? (`${mv.to[0]}${mv.from[1]}` as Square) : mv.to;
  const rank = mv.from[1];
  const rookFrom = isCastle ? ((fileDiff > 0 ? `h${rank}` : `a${rank}`) as Square) : null;
  const rookTo = isCastle ? ((fileDiff > 0 ? `f${rank}` : `d${rank}`) as Square) : null;

  return pieces
    .filter(p => p.square !== capturedSq || p.id === mover.id)
    .map(p => {
      if (p.id === mover.id) return { ...p, square: mv.to, type: mv.promotion ?? p.type };
      if (rookFrom && rookTo && p.square === rookFrom) return { ...p, square: rookTo };
      return p;
    });
}
