'use client';

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { ReviewMoveDTO } from '@/modules/coach/infrastructure/dto/coachSchemas';
import { moveLabel } from '@/modules/coach/domain/notation';
import { areaPath, keyTarget, linePath, momentPoints, nearestIndex, winText, xOf, yOf, type Box } from '../lib/evalGraph';
import { MOVE_CLASS_UI, isError } from '../lib/moveClass';

interface Props {
  winWhite: number[];            // largo = jugadas + 1 (índice 0 = posición inicial)
  moves: ReviewMoveDTO[];
  keyMoments: number[];
  ply: number;                   // la jugada que muestra la repetición
  onPly: (ply: number) => void;  // ir a esa jugada
}

const H = 128, PAD = { padL: 8, padR: 8, padT: 10, padB: 10 };

/** "Jugada 14… Cxe5 · Error grave ??" o "Posición inicial". */
function describe(ply: number, moves: ReviewMoveDTO[]) {
  const m = moves[ply - 1];
  if (!m) return 'Posición inicial';
  const c = MOVE_CLASS_UI[m.class];
  return `${moveLabel(m)}${isError(m.class) ? ` · ${c.label} ${c.symbol}` : ''}`;
}

/** Ventaja durante la partida: una sola serie (blancas), sin leyenda, con cruz al pasar y control con teclado. */
export function EvalGraph({ winWhite, moves, keyMoments, ply, onPly }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const tableId = useId();

  // depende de `table`: al volver de la tabla el contenedor es otro
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [table]);

  const n = winWhite.length;
  const b: Box = { w: Math.max(w, 1), h: H, ...PAD };
  const shown = hover ?? ply;
  const plyAt = (e: PointerEvent<SVGSVGElement>) => nearestIndex(e.clientX - e.currentTarget.getBoundingClientRect().left, n, b);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const next = keyTarget(e.key, ply, n);
    if (next === null) return;
    e.preventDefault();
    onPly(next);
  }

  const tip = hover !== null && w > 0 ? { x: xOf(hover, n, b), y: yOf(winWhite[hover]!, b) } : null;

  return (
    <figure className="m-0">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <figcaption className="font-mono text-[11px] uppercase tracking-[.12em] text-ink-soft">Ventaja durante la partida</figcaption>
        <button type="button" className="min-h-8 whitespace-nowrap font-mono text-xs text-ink-soft underline underline-offset-4"
          aria-pressed={table} aria-controls={table ? tableId : undefined} onClick={() => { setTable(t => !t); setHover(null); }}>
          {table ? 'Ver gráfica' : 'Ver como tabla'}
        </button>
      </div>

      {!table && (
        <div ref={wrap} role="slider" tabIndex={0} aria-label="Ventaja por jugada"
          aria-valuemin={0} aria-valuemax={n - 1} aria-valuenow={ply}
          aria-valuetext={`${describe(ply, moves)}. ${winText(winWhite[ply] ?? 50)}`}
          onKeyDown={onKey}
          className="relative h-[128px] rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-vellum">
          {w > 0 && (
            <svg width={w} height={H} className="block cursor-crosshair touch-none select-none" aria-hidden="true"
              onPointerMove={e => setHover(plyAt(e))}
              onPointerLeave={e => { if (e.pointerType === 'mouse') setHover(null); }}
              onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setHover(plyAt(e)); }}
              onPointerUp={e => { onPly(plyAt(e)); if (e.pointerType !== 'mouse') setHover(null); }}>
              <text x={8} y={PAD.padT + 2} dominantBaseline="hanging" className="fill-ink-faint font-mono text-[10px]">Blancas</text>
              <text x={8} y={H - PAD.padB - 4} className="fill-ink-faint font-mono text-[10px]">Negras</text>
              <path d={areaPath(winWhite, b)} fill="var(--t-ink)" fillOpacity={.08} />
              <line x1={0} x2={w} y1={yOf(50, b)} y2={yOf(50, b)} stroke="var(--t-rule)" strokeWidth={1} />
              <path d={linePath(winWhite, b)} fill="none" stroke="var(--t-ink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <line x1={xOf(ply, n, b)} x2={xOf(ply, n, b)} y1={PAD.padT} y2={H - PAD.padB} stroke="var(--t-soft)" strokeWidth={1} />
              {momentPoints(winWhite, keyMoments, b).map(p => (
                <circle key={p.ply} cx={p.x} cy={p.y} r={5} fill={MOVE_CLASS_UI[moves[p.ply - 1]!.class].color ?? 'var(--t-ink)'}
                  stroke="var(--t-panel)" strokeWidth={2} />
              ))}
              {tip && <>
                <line x1={tip.x} x2={tip.x} y1={PAD.padT} y2={H - PAD.padB} stroke="var(--t-ink)" strokeOpacity={.35} strokeWidth={1} />
                <circle cx={tip.x} cy={tip.y} r={4} fill="var(--t-ink)" stroke="var(--t-panel)" strokeWidth={2} />
              </>}
            </svg>
          )}
          {tip && (
            <div aria-hidden="true"
              className="pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-lg border border-rule bg-vellum px-2.5 py-1.5 font-mono text-xs text-ink shadow-sm"
              style={tip.x < w / 2 ? { left: tip.x + 10 } : { right: w - tip.x + 10 }}>
              <div>{describe(shown, moves)}</div>
              <div className="text-ink-soft">{winText(winWhite[shown]!)}</div>
            </div>
          )}
        </div>
      )}

      {table && (
        <div id={tableId} className="max-h-[260px] overflow-auto rounded-[10px] border border-rule">
          <table className="w-full border-collapse text-left font-mono text-xs">
            <caption className="sr-only">Ventaja de las blancas después de cada jugada</caption>
            <thead className="sticky top-0 bg-vellum text-ink-soft">
              <tr><th scope="col" className="px-3 py-2">Jugada</th><th scope="col" className="px-3 py-2">Clase</th><th scope="col" className="px-3 py-2 text-right">Blancas</th></tr>
            </thead>
            <tbody>
              {moves.map(m => (
                <tr key={m.ply} className="border-t border-rule">
                  <td className="px-3 py-1.5"><button type="button" className="underline underline-offset-4" onClick={() => onPly(m.ply)}>{moveLabel(m)}</button></td>
                  <td className="px-3 py-1.5">{MOVE_CLASS_UI[m.class].label} {MOVE_CLASS_UI[m.class].symbol}</td>
                  <td className="px-3 py-1.5 text-right">{Math.round(m.winWhiteAfter)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
