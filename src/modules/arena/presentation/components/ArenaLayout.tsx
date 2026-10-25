'use client';

import type { ReactNode } from 'react';
import type { Move } from 'chess.js';
import type { Square } from '@/components/chess/types';
import type { BoardView } from '@/components/three/scenes/gameBoardScene';
import { GameBoard3D } from './GameBoard3D';
import { MoveList } from './MoveList';
import { PlayerStrip } from './PlayerStrip';
import { SanInput } from './SanInput';

type Strip = Parameters<typeof PlayerStrip>[0];

export type ArenaLayoutProps = {
  eyebrow: string; title: string; titleAccent?: boolean; sub: string; notice?: string; sync: string; live: string;
  rival: Strip; you: Strip;
  view: BoardView; stageLabel: string; onSquare: (sq: Square) => void;
  sans: string[]; legal: Move[]; canType: boolean; onPlay: (uci: string) => void;
  overlay?: ReactNode;      // diálogo de coronación o banda del final, sobre el escenario
  actions?: ReactNode;      // botones del panel (tablas, rendirse, girar…)
  panelOpen?: boolean;      // false: el panel se pliega (y queda inert) y el tablero ocupa el centro
};

// el tablero cabe en la altura de la ventana (portátiles de 768 px): escenario 6:5 bajo cabecera, franjas y márgenes
const STAGE_WIDTH = 'min(100%, calc((100dvh - 232px) * 1.2))';

/** Tablero con las franjas de los jugadores · panel de la partida (debajo en pantallas de menos de 1024 px). */
export function ArenaLayout({ panelOpen = true, ...p }: ArenaLayoutProps) {
  return (
    <div className="mx-auto flex max-w-[1320px] flex-col items-stretch gap-y-8 px-5 pb-14 pt-6 lg:flex-row lg:items-start lg:px-10">
      {/* fuera del panel: se sigue oyendo con el panel oculto */}
      <p role="status" aria-live="polite" className="sr-only">{p.live}</p>
      <section aria-label="Tablero" className="flex min-w-0 flex-1 justify-center animate-rise">
        <div className="flex w-full flex-col gap-2.5" style={{ maxWidth: STAGE_WIDTH }}>
          <PlayerStrip {...p.rival} />
          <GameBoard3D view={p.view} onSquare={p.onSquare} label={p.stageLabel}>{p.overlay}</GameBoard3D>
          <PlayerStrip {...p.you} />
        </div>
      </section>
      <div inert={!panelOpen}
        className={`shrink-0 overflow-hidden transition-[width,margin-left,opacity] duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)] ${panelOpen ? 'lg:ml-10 lg:w-[380px] lg:opacity-100' : 'max-lg:hidden lg:ml-0 lg:w-0 lg:opacity-0'}`}>
        {/* ancho interno fijo: el contenido no se reacomoda mientras se pliega */}
        <aside id="arena-panel" aria-labelledby="status-title" className="flex flex-col gap-[18px] pt-1 animate-rise [animation-delay:.1s] lg:w-[380px]">
          <div className="flex flex-col gap-2">
            <p className="eyebrow">{p.eyebrow}</p>
            <h1 id="status-title" className={`font-display text-[clamp(48px,5vw,68px)] font-semibold leading-none tracking-[-.02em] ${p.titleAccent ? 'text-accent' : ''}`}>{p.title}</h1>
            <p className="mt-1 min-h-[25px] text-ink-soft">{p.sub}</p>
            {p.notice && <p className="text-[15px] text-accent animate-rise">{p.notice}</p>}
          </div>
          <p className="flex items-center gap-2.5 font-mono text-xs text-ink-soft">
            <span aria-hidden="true" className="relative flex size-2">
              <span className="absolute inset-0 rounded-full bg-ok opacity-50 motion-safe:animate-ping" />
              <span className="relative size-2 rounded-full bg-ok" />
            </span>
            {p.sync}
          </p>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-mono text-[11px] font-normal uppercase tracking-[.14em] text-ink-faint">Jugadas</h2>
              <span className="font-mono text-xs text-ink-faint">{p.sans.length ? `jugada ${Math.ceil(p.sans.length / 2)}` : ''}</span>
            </div>
            <MoveList sans={p.sans} current={p.sans.length} />
          </div>
          <SanInput legal={p.legal} disabled={!p.canType} onPlay={p.onPlay} />
          {p.actions}
        </aside>
      </div>
    </div>
  );
}
