'use client';

import type { ReactNode } from 'react';
import { Board2D } from '@/components/chess/Board2D';
import type { Square } from '@/components/chess/types';
import type { BoardView } from '@/components/three/scenes/gameBoardScene';
import { useBoardMode } from '../hooks/useBoardMode';
import { GameBoard3D } from './GameBoard3D';

/** El tablero que eligió el usuario. En 2D, GameBoard3D no se monta: three no se descarga y la escena se libera. */
export function BoardStage({ view, onSquare, label, children }: { view: BoardView; onSquare: (sq: Square) => void; label: string; children?: ReactNode }) {
  const { mode, intro } = useBoardMode();
  return mode === '3d'
    ? <GameBoard3D view={intro ? view : { ...view, intro: false }} onSquare={onSquare} label={label}>{children}</GameBoard3D>
    : <Board2D view={view} onSquare={onSquare}>{children}</Board2D>;
}
