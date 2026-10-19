'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Board2D } from '@/components/chess/Board2D';
import type { Square } from '@/components/chess/types';
import { ThreeCanvas } from '@/components/three/ThreeCanvas';
import { useThreeScene } from '@/components/three/useThreeScene';
import type { BoardView } from '@/components/three/scenes/gameBoardScene';

const loadBoard = () => import('@/components/three/scenes/gameBoardScene').then(mod => mod.createGameBoardScene);

/** React manda: cada cambio de `view` llega a la escena por un efecto. Sin WebGL, el tablero 2D accesible. */
export function GameBoard3D({ view, onSquare, label, children }: { view: BoardView; onSquare: (sq: Square) => void; label: string; children?: ReactNode }) {
  const { canvasRef, scene, failed } = useThreeScene(loadBoard);
  const [pickable, setPickable] = useState(false);
  useEffect(() => { scene?.onSquare(onSquare); scene?.onPickable(setPickable); }, [scene, onSquare]);
  useEffect(() => { scene?.update(view); }, [scene, view]);

  if (failed) return (
    <div className="relative flex justify-center rounded-[28px] bg-band p-4">
      <Board2D view={view} onSquare={onSquare} />
      {children}
    </div>
  );
  return (
    <ThreeCanvas ref={canvasRef} ready={!!scene} className="aspect-[6/5] w-full rounded-[28px] bg-band" style={{ cursor: pickable ? 'pointer' : 'default' }}>
      <p aria-hidden="true" className="pointer-events-none absolute left-[22px] top-[18px] font-mono text-[11px] uppercase tracking-[.14em] text-ink-faint">{label}</p>
      {children}
    </ThreeCanvas>
  );
}
