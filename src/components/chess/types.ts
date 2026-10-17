export type { PieceType } from '@/components/three/kit';
import type { PieceType } from '@/components/three/kit';

export type Color = 'w' | 'b';
export type Square = `${'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
export interface BoardPiece { id: string; type: PieceType; color: Color; square: Square }
export interface Arrow { from: Square; to: Square; weight: number }   // 0..1 → opacidad
export interface MoveLike { from: Square; to: Square; promotion?: PieceType }
