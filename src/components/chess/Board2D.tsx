'use client';

import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { BoardView } from '@/components/three/scenes/gameBoardScene';
import { PIECE_NAME } from './glyphs';
import type { BoardPiece, PieceType, Square } from './types';

const FILES = 'abcdefgh';
// rellenos para los dos colores (las blancas se pintan en papel con contorno); VS15 pide la versión de texto
const FILLED: Record<PieceType, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const FEMININE = new Set<PieceType>(['q', 'r']);

/** "torre blanca", "rey negro": dama y torre son femeninas. */
export const pieceLabel = (type: PieceType, color: 'w' | 'b') =>
  `${PIECE_NAME[type]} ${color === 'w' ? (FEMININE.has(type) ? 'blanca' : 'blanco') : (FEMININE.has(type) ? 'negra' : 'negro')}`;

/** Polígono de una flecha de (x1,y1) a (x2,y2) en un tablero de 800×800 (100 por casilla). */
export function arrowPath(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const s = 26, hl = 40, w = 10, hw = 28, e = L - 8;
  const P = (a: number, b: number) => `${(x1 + ux * a + nx * b).toFixed(1)} ${(y1 + uy * a + ny * b).toFixed(1)}`;
  return `M${P(s, -w)}L${P(e - hl, -w)}L${P(e - hl, -hw)}L${P(e, 0)}L${P(e - hl, hw)}L${P(e - hl, w)}L${P(s, w)}Z`;
}

/** Casillas en orden de pantalla: la primera es a8 (blancas abajo) o h1 (negras abajo). */
export const screenSquares = (orientation: 'white' | 'black') => Array.from({ length: 64 }, (_, i) => {
  const r = Math.floor(i / 8), c = i % 8, white = orientation === 'white';
  return `${FILES[white ? c : 7 - c]}${white ? 8 - r : r + 1}` as Square;
});

/**
 * Tablero 2D completo: 64 botones con roving tabindex (flechas mueven el foco, Enter elige, Esc suelta),
 * piezas que se deslizan (key = id estable), marcas, coordenadas y flechas. Mismo onSquare que el 3D.
 */
export function Board2D({ view, onSquare, children }: { view: BoardView; onSquare: (sq: Square) => void; children?: ReactNode }) {
  const white = view.orientation === 'white';
  const squares = screenSquares(view.orientation);
  const pos = (sq: Square) => { const i = squares.indexOf(sq); return { r: Math.floor(i / 8), c: i % 8 }; };
  const [focus, setFocus] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const at = new Map(view.pieces.map(p => [p.square, p]));
  const { tileL, tileD, frame, soft, accent } = view.colors;

  // las capturadas se quedan donde cayeron (la casilla de la última jugada) y se desvanecen; al retroceder vuelven
  const fallen = view.lastMove?.[1] ?? 'a1';
  const ghosts: BoardPiece[] = [...view.captured.white, ...view.captured.black]
    .map(id => ({ id, type: id[1] as PieceType, color: id[0] as 'w' | 'b', square: fallen }));

  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key === 'Escape') { if (view.selected) { e.preventDefault(); onSquare(view.selected); } return; }   // elegirla otra vez la suelta
    const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 8, ArrowUp: -8 }[e.key];
    if (d === undefined) return;
    e.preventDefault();
    const n = i + d;
    if (n < 0 || n > 63 || (Math.abs(d) === 1 && Math.floor(n / 8) !== Math.floor(i / 8))) return;   // sin saltar de fila
    setFocus(n); refs.current[n]?.focus();
  };

  return (
    <div className="relative aspect-square w-full rounded-[14px] p-[14px]" style={{ backgroundColor: frame }}>
      <div role="group" aria-label={`Tablero 2D, vista desde las ${white ? 'blancas' : 'negras'}. Usa las flechas para moverte.`}
        className="relative grid size-full grid-cols-8 grid-rows-8 overflow-hidden rounded-[4px]">
        {squares.map((sq, i) => {
          const p = at.get(sq), c = i % 8, r = Math.floor(i / 8);
          const dark = (FILES.indexOf(sq[0]!) + Number(sq[1])) % 2 === 1;   // a1 es oscura
          const target = view.targets.includes(sq), capture = view.captures.includes(sq);
          const label = [sq, p && pieceLabel(p.type, p.color), view.check === sq && 'en jaque', view.selected === sq && 'elegida',
            target && 'puedes mover aquí', capture && 'puedes capturar'].filter(Boolean).join(', ');
          const ink = dark ? tileL : frame;   // coordenadas: el color que más contrasta con la casilla
          return (
            <button key={sq} ref={el => { refs.current[i] = el; }} type="button" aria-label={label}
              tabIndex={i === focus ? 0 : -1} onFocus={() => setFocus(i)} onKeyDown={e => onKey(e, i)}
              onClick={() => view.interactive && onSquare(sq)}
              className="relative focus-visible:z-10 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-accent"
              style={{ backgroundColor: dark ? tileD : tileL }}>
              {view.lastMove?.includes(sq) && <span aria-hidden="true" className="absolute inset-0 bg-[#c8a676]/55" />}
              {view.selected === sq && <span aria-hidden="true" className="absolute inset-0 opacity-30" style={{ backgroundColor: accent }} />}
              {view.check === sq && <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle,#a3341f_0%,#a3341fcc_35%,transparent_75%)]" />}
              {target && <span aria-hidden="true" className="absolute left-1/2 top-1/2 size-[28%] -translate-1/2 rounded-full opacity-55" style={{ backgroundColor: accent }} />}
              {capture && <span aria-hidden="true" className="absolute inset-[6%] rounded-full border-[5px] opacity-80" style={{ borderColor: accent }} />}
              {c === 0 && <span aria-hidden="true" className="absolute left-1 top-0.5 font-mono text-[11px] leading-none" style={{ color: ink }}>{sq[1]}</span>}
              {r === 7 && <span aria-hidden="true" className="absolute bottom-0.5 right-1 font-mono text-[11px] leading-none" style={{ color: ink }}>{sq[0]}</span>}
            </button>
          );
        })}
      </div>

      {/* piezas encima, sin recibir clics: el mismo nodo (key = id) se desliza de casilla en casilla */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-[14px] [container-type:size]">
        {[...view.pieces.map(p => ({ p, alive: true })), ...ghosts.map(p => ({ p, alive: false }))].map(({ p, alive }) => {
          const { r, c } = pos(p.square), lifted = alive && view.selected === p.square, w = p.color === 'w';
          return (
            <span key={p.id} data-piece={p.id}
              className="absolute left-0 top-0 flex size-[12.5%] items-center justify-center font-chess text-[9.6cqw] leading-none transition-[transform,opacity] duration-[340ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
              style={{ transform: `translate(${c * 100}%, ${r * 100}%)${lifted ? ' scale(1.12)' : alive ? '' : ' scale(.6)'}`,
                opacity: alive ? 1 : 0, zIndex: lifted ? 3 : 1, color: w ? 'var(--t-bg)' : 'var(--t-ink)',
                WebkitTextStroke: w ? '1.4px var(--t-ink)' : '.6px var(--t-ink)', textShadow: '0 2px 3px rgb(42 20 23 / .28)' }}>
              {FILLED[p.type]}︎
            </span>
          );
        })}
      </div>

      {!!view.arrows?.length && (
        <svg aria-hidden="true" viewBox="0 0 800 800" className="pointer-events-none absolute inset-[14px] size-[calc(100%-28px)]">
          {view.arrows.map(a => {
            const A = pos(a.from), B = pos(a.to);
            return <path key={`${a.from}${a.to}`} d={arrowPath(A.c * 100 + 50, A.r * 100 + 50, B.c * 100 + 50, B.r * 100 + 50)}
              fill={a.tone === 'played' ? soft : accent} opacity={a.tone === 'hint' ? .85 : a.tone === 'played' ? .7 : .78} />;
          })}
        </svg>
      )}
      {children}
    </div>
  );
}
