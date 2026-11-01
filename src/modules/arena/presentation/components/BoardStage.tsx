'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Board2D } from '@/components/chess/Board2D';
import type { Square } from '@/components/chess/types';
import type { BoardView } from '@/components/three/scenes/gameBoardScene';
import { useBoardMode } from '../hooks/useBoardMode';
import { GameBoard3D } from './GameBoard3D';

type Props = { view: BoardView; onSquare: (sq: Square) => void; label: string; children?: ReactNode };

/** El tablero que eligió el usuario. En 2D, GameBoard3D no se monta: three no se descarga y la escena se libera. */
export function BoardStage(p: Props) {
  const { mode } = useBoardMode();
  return mode === '3d' ? <Upgrade3D {...p} /> : <Board2D view={p.view} onSquare={p.onSquare}>{p.children}</Board2D>;
}

const LAYER = 'absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none';

/**
 * El 2D pinta al instante y ya se puede jugar. El 3D se prepara oculto cuando el navegador está libre y entra con un
 * fundido cuando dibujó su primer cuadro; si no llega a dibujar, se queda el 2D. Con el foco en el 2D no se cambia.
 */
function Upgrade3D({ view, onSquare, label, children }: Props) {
  const [ready, setReady] = useState(false);
  const [focused, setFocused] = useState(false);
  const [gone, setGone] = useState(false);   // el 2D ya se desvaneció: se desmonta
  const swap = ready && !focused;
  useEffect(() => {
    if (!swap) return;
    const t = setTimeout(() => setGone(true), 320);
    return () => { clearTimeout(t); setGone(false); };   // Next oculta la página y libera la escena: al volver, otra vez el 2D
  }, [swap]);

  return (
    <div className="relative aspect-[6/5] w-full">
      {!gone && (
        <div className={`${LAYER} flex justify-center ${swap ? 'opacity-0' : ''}`} inert={swap}
          onFocus={() => setFocused(true)}
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false); }}>
          <div className="aspect-square h-full"><Board2D view={view} onSquare={onSquare} /></div>
        </div>
      )}
      <div className={`${LAYER} ${swap ? '' : 'pointer-events-none opacity-0'}`} inert={!swap}>
        <GameBoard3D view={{ ...view, intro: false }} onSquare={onSquare} onReady={setReady} label={label} />
      </div>
      {children}
    </div>
  );
}
