'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import type { BoardView } from '@/components/three/scenes/gameBoardScene';
import { PIECE_NAME, glyph } from './glyphs';
import type { Square } from './types';

const FILES = 'abcdefgh';

/** Sin WebGL: 64 botones con roving tabindex (flechas mueven el foco, Enter elige). Mismos datos y mismo onSquare. */
export function Board2D({ view, onSquare }: { view: BoardView; onSquare: (sq: Square) => void }) {
  const white = view.orientation === 'white';
  const squares = Array.from({ length: 64 }, (_, i) => {
    const r = Math.floor(i / 8), c = i % 8;
    return `${FILES[white ? c : 7 - c]}${white ? 8 - r : r + 1}` as Square;
  });
  const [focus, setFocus] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const at = new Map(view.pieces.map(p => [p.square, p]));

  const onKey = (e: KeyboardEvent, i: number) => {
    const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 8, ArrowUp: -8 }[e.key];
    if (d === undefined) return;
    e.preventDefault();
    const n = Math.min(63, Math.max(0, i + d));
    setFocus(n); refs.current[n]?.focus();
  };

  return (
    <div role="grid" aria-label="Tablero" className="grid aspect-square w-full max-w-[560px] grid-cols-8 grid-rows-8 overflow-hidden rounded-[20px]">
      {squares.map((sq, i) => {
        const p = at.get(sq);
        const dark = (FILES.indexOf(sq[0]!) + Number(sq[1])) % 2 === 0;
        const mark = view.selected === sq ? 'shadow-[inset_0_0_0_4px_var(--t-acc)]'
          : view.captures.includes(sq) ? 'shadow-[inset_0_0_0_3px_var(--t-acc)]'
          : view.check === sq ? 'shadow-[inset_0_0_0_4px_#a3341f]' : '';
        const label = `${sq}${p ? `, ${PIECE_NAME[p.type]} ${p.color === 'w' ? 'blanco' : 'negro'}` : ''}${view.targets.includes(sq) ? ', destino' : view.captures.includes(sq) ? ', captura' : ''}`;
        return (
          <button key={sq} ref={el => { refs.current[i] = el; }} type="button" role="gridcell" aria-label={label}
            tabIndex={i === focus ? 0 : -1} onFocus={() => setFocus(i)} onKeyDown={e => onKey(e, i)}
            onClick={() => view.interactive && onSquare(sq)} disabled={!view.interactive && !p}
            className={`relative grid place-items-center font-chess text-[clamp(22px,5vw,44px)] leading-none ${dark ? 'bg-[#c9b08e]' : 'bg-[#efe4d3]'} ${mark}`}
            style={view.lastMove?.includes(sq) ? { backgroundColor: '#d9bf8c' } : undefined}>
            {p && <span aria-hidden="true" className="text-[#2a1417]">{glyph(p.type, p.color)}</span>}
            {view.targets.includes(sq) && <span aria-hidden="true" className="absolute size-3 rounded-full bg-accent/60" />}
          </button>
        );
      })}
    </div>
  );
}
