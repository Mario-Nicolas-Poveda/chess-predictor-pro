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
};

/** Dos columnas como la vista "Arena · partida en vivo": tablero con las franjas de los jugadores · panel de la partida. */
export function ArenaLayout(p: ArenaLayoutProps) {
  return (
    <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-x-14 gap-y-8 px-5 pb-14 pt-6 lg:px-10">
      <p role="status" aria-live="polite" className="sr-only">{p.live}</p>
      <section aria-label="Tablero" className="flex min-w-0 flex-[1_1_640px] flex-col gap-3 animate-rise">
        <PlayerStrip {...p.rival} />
        <GameBoard3D view={p.view} onSquare={p.onSquare} label={p.stageLabel}>{p.overlay}</GameBoard3D>
        <PlayerStrip {...p.you} />
      </section>
      <aside aria-labelledby="status-title" className="flex min-w-0 flex-[1_1_360px] flex-col gap-[22px] pt-1 animate-rise [animation-delay:.1s]">
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
  );
}
