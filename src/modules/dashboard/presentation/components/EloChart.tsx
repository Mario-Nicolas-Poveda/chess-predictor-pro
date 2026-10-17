'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { DUR, EASE_OUT } from '@/lib/motion';

export type EloPoint = { date: string; elo: number };

const W = 1000, H = 300;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const pct = (v: number, total: number) => `${(v / total) * 100}%`;

// Las etiquetas y el tooltip van en HTML posicionado con %, no dentro del SVG estirado, para que el texto no se deforme.
export function EloChart({ points, currentElo, drawn }: { points: EloPoint[]; currentElo: number; drawn: boolean }) {
  const clipId = useId();
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const n = points.length;

  const geo = useMemo(() => {
    if (n < 2) return null;
    const elos = points.map(p => p.elo);
    const lo = Math.floor((Math.min(...elos) - 50) / 100) * 100;
    const hi = Math.ceil((Math.max(...elos) + 50) / 100) * 100;
    const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
    const x = (i: number) => (i / (n - 1)) * W;
    const line = 'M' + points.map((p, i) => `${x(i).toFixed(1)} ${y(p.elo).toFixed(1)}`).join(' L');
    const grid: { v: number; y: number }[] = [];
    for (let v = lo; v <= hi; v += 100) grid.push({ v, y: y(v) });
    return { x, y, line, area: `${line} L${W} ${H} L0 ${H} Z`, grid };
  }, [points, n]);

  if (!geo) return <EloChartEmpty elo={currentElo} />;

  const pick = (clientX: number, rect: DOMRect) => {
    const i = Math.round(clamp01((clientX - rect.left) / rect.width) * (n - 1));
    setHover(prev => (prev === i ? prev : i));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') setHover(h => Math.min(n - 1, (h ?? n - 1) + 1));
    else if (e.key === 'ArrowLeft') setHover(h => Math.max(0, (h ?? n - 1) - 1));
    else if (e.key === 'Home') setHover(0);
    else if (e.key === 'End') setHover(n - 1);
    else if (e.key === 'Escape') setHover(null);
    else return;
    e.preventDefault();
  };
  const hp = hover !== null ? points[hover] : undefined;
  const last = points[n - 1]!;

  return (
    <figure className="m-0">
      <div role="img" tabIndex={0}
        aria-label={`Elo de ${points[0]!.elo} a ${last.elo} en ${n} días. Usa las flechas para recorrer los días.`}
        onPointerMove={e => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setHover(null)} onKeyDown={onKey}
        onFocus={() => setHover(n - 1)} onBlur={() => setHover(null)}
        className="relative h-[300px] cursor-crosshair rounded-[10px] focus-visible:outline-offset-8">
        <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <defs>
            <clipPath id={clipId}>
              {/* se dibuja cada vez que se abre la sección */}
              <m.rect x={0} y={-20} height={H + 40} initial={false}
                animate={{ width: drawn || reduce ? W : 0 }}
                transition={drawn ? { duration: DUR.draw, ease: EASE_OUT, delay: 0.25 } : { duration: 0 }} />
            </clipPath>
          </defs>
          {geo.grid.map(g => <line key={g.v} x1={0} x2={W} y1={g.y} y2={g.y} stroke="var(--color-rule)" vectorEffect="non-scaling-stroke" />)}
          <g clipPath={`url(#${clipId})`}>
            <path d={geo.area} fill="var(--color-accent)" fillOpacity={0.09} />
            <path d={geo.line} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
        {geo.grid.map(g => (
          <span key={g.v} aria-hidden="true" className="absolute left-0 -translate-y-[130%] font-mono text-[11px] text-ink-faint nums" style={{ top: pct(g.y, H) }}>{g.v}</span>
        ))}
        <span aria-hidden="true" className={`absolute right-0 size-3 translate-x-1/2 -translate-y-1/2 rounded-full bg-accent transition-opacity duration-400 ${drawn ? 'opacity-100' : 'opacity-0'}`}
          style={{ top: pct(geo.y(last.elo), H) }} />
        {hp && hover !== null && (
          <>
            <span aria-hidden="true" className="absolute inset-y-0 w-px bg-rule" style={{ left: pct(geo.x(hover), W) }} />
            <span aria-hidden="true" className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper shadow-[inset_0_0_0_3px_var(--t-acc)]"
              style={{ left: pct(geo.x(hover), W), top: pct(geo.y(hp.elo), H) }} />
            <span aria-hidden="true" className="absolute -top-2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[10px] bg-ink px-3 py-2 text-[13px] text-paper nums"
              style={{ left: pct(geo.x(hover), W) }}>
              <strong className="font-semibold">{hp.elo}</strong> · {hp.date}
            </span>
          </>
        )}
      </div>
      <p aria-live="polite" className="sr-only">{hp ? `${hp.date}: ${hp.elo}` : ''}</p>
    </figure>
  );
}

function EloChartEmpty({ elo }: { elo: number }) {
  return (
    <figure className="m-0">
      <div className="relative h-[300px]" role="img" aria-label={`Sin partidas todavía; ELO actual ${elo}.`}>
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-muted" />
        <span aria-hidden="true" className="absolute left-0 top-1/2 -translate-y-[160%] font-mono text-[11px] text-ink-faint nums">{elo}</span>
      </div>
      <figcaption className="mt-3.5 font-display text-xl italic text-ink-soft">Tu curva empieza con tu primera partida.</figcaption>
    </figure>
  );
}
