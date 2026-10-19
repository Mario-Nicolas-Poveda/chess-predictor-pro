import type { Color, PieceType } from './types';

// VS16 (︎) pide la versión de texto: sin él algunos sistemas pintan los glifos como emoji.
const WHITE: Record<PieceType, string> = { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' };
const BLACK: Record<PieceType, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
export const glyph = (type: PieceType, color: Color) => (color === 'w' ? WHITE : BLACK)[type] + '︎';
export const PIECE_NAME: Record<PieceType, string> = { k: 'rey', q: 'dama', r: 'torre', b: 'alfil', n: 'caballo', p: 'peón' };
export const PIECE_VALUE: Record<PieceType, number> = { k: 0, q: 9, r: 5, b: 3, n: 3, p: 1 };
