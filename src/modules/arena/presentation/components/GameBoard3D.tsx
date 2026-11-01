'use client';

import { useEffect, useState } from 'react';
import { Board2D } from '@/components/chess/Board2D';
import type { Square } from '@/components/chess/types';
import { ThreeCanvas } from '@/components/three/ThreeCanvas';
import { useThreeScene } from '@/components/three/useThreeScene';
import { markNoWebgl } from '../hooks/useBoardMode';
import type { BoardView } from '@/components/three/scenes/gameBoardScene';

const loadBoard = () => import('@/components/three/scenes/gameBoardScene').then(mod => mod.createGameBoardScene);

/** React manda: cada cambio de `view` llega a la escena por un efecto. Sin WebGL, el tablero 2D accesible. `onReady`: la escena dibujó (o se liberó). */
export function GameBoard3D({ view, onSquare, onReady, label }: { view: BoardView; onSquare: (sq: Square) => void; onReady: (ready: boolean) => void; label: string }) {
  const { canvasRef, scene, failed } = useThreeScene(loadBoard);
  const [pickable, setPickable] = useState(false);
  useEffect(() => { scene?.onSquare(onSquare); scene?.onPickable(setPickable); }, [scene, onSquare]);
  useEffect(() => { scene?.update(view); }, [scene, view]);
  useEffect(() => { onReady(!!scene); }, [scene, onReady]);
  useEffect(() => { if (failed) markNoWebgl(); }, [failed]);

  if (failed) return <Board2D view={view} onSquare={onSquare} />;
  return (
    // ready fijo: el fundido lo pone BoardStage
    <ThreeCanvas ref={canvasRef} ready className="aspect-[6/5] w-full rounded-[28px] bg-band" style={{ cursor: pickable ? 'pointer' : 'default' }}>
      <p aria-hidden="true" className="pointer-events-none absolute left-[22px] top-[18px] font-mono text-[11px] uppercase tracking-[.14em] text-ink-faint">{label}</p>
    </ThreeCanvas>
  );
}
