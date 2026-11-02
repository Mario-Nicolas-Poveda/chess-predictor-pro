'use client';

import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SummaryStats } from '@/modules/coach/infrastructure/dto/coachSchemas';
import { linePath, nearestIndex, xOf, yOf, type Box } from '../lib/evalGraph';
import { shortDate, trendFloor, trendPct, trendTicks } from '../lib/trend';
import { ChartFigure } from './ChartFigure';

type Point = SummaryStats['accuracyTrend'][number];

const H = 170, PAD = { padL: 32, padR: 44, padT: 12, padB: 26 };
const replay = (id: string) => `/dashboard/partidas/${id}?tab=analisis`;

/** Precisión partida a partida: una sola serie, sin leyenda. Con 1 o 2 partidas una línea no dice nada: solo los números. */
export function AccuracyTrend({ points }: { points: Point[] }) {
  const rows = (
    <table className="w-full border-collapse font-mono text-xs">
      <caption className="sr-only">Precisión por partida, de la más vieja a la más nueva</caption>
      <thead><tr className="text-left text-ink-soft"><th scope="col" className="p-2 font-medium">Partida</th><th scope="col" className="p-2 text-right font-medium">Precisión</th></tr></thead>
      <tbody>
        {points.map(p => (
          <tr key={p.matchId} className="border-t border-rule">
            <td className="p-2"><Link href={replay(p.matchId)} className="underline underline-offset-4">{shortDate(p.endedAt)}</Link></td>
            <td className="p-2 text-right">{p.accuracy} %</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  return <ChartFigure title="Tu precisión, partida a partida" graph={points.length < 3 ? rows : <TrendGraph points={points} />} table={rows} />;
}

function TrendGraph({ points }: { points: Point[] }) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.round(e!.contentRect.width)));
    ro.observe(wrap.current!);
    return () => ro.disconnect();
  }, []);
  const first = points[0]!, last = points.at(-1)!;
  return (
    <div ref={wrap} role="img" aria-label={`Precisión en ${points.length} partidas: de ${first.accuracy} % a ${last.accuracy} %.`} className="relative h-[170px]">
      {w > 0 && <TrendChart points={points} w={w} onOpen={id => router.push(replay(id))} />}
    </div>
  );
}

/** El dibujo, ya con su ancho. Tocar un punto abre esa partida; el teclado llega por los enlaces de la tabla. */
export function TrendChart({ points, w, onOpen }: { points: Point[]; w: number; onOpen: (matchId: string) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const acc = points.map(p => p.accuracy), lo = trendFloor(acc), n = points.length;
  const b: Box = { w, h: H, ...PAD };
  const y = (v: number) => yOf(trendPct(v, lo), b);
  const at = (e: MouseEvent<SVGSVGElement>) => nearestIndex(e.clientX - e.currentTarget.getBoundingClientRect().left, n, b);
  const tip = hover === null ? null : { p: points[hover]!, x: xOf(hover, n, b) };
  const lastAcc = acc[n - 1]!;
  return (
    <>
      {/* touch-pan-y: deslizar sobre la gráfica sigue moviendo la página */}
      <svg width={w} height={H} aria-hidden="true" className="block cursor-pointer touch-pan-y select-none"
        onPointerMove={e => setHover(at(e))} onPointerDown={e => setHover(at(e))} onPointerLeave={() => setHover(null)} onPointerCancel={() => setHover(null)}
        onClick={e => onOpen(points[at(e)]!.matchId)}>
        {trendTicks(lo).map(t => (
          <g key={t}>
            <line x1={PAD.padL} x2={w - PAD.padR} y1={y(t)} y2={y(t)} stroke="var(--t-rule)" strokeWidth={1} />
            <text x={PAD.padL - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-ink-soft font-mono text-[11px]">{t}</text>
          </g>
        ))}
        <path d={linePath(acc.map(v => trendPct(v, lo)), b)} fill="none" stroke="var(--t-acc)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => <circle key={p.matchId} cx={xOf(i, n, b)} cy={y(p.accuracy)} r={4} fill="var(--t-acc)" stroke="var(--t-panel)" strokeWidth={2} />)}
        <text x={xOf(n - 1, n, b) + 9} y={y(lastAcc)} dominantBaseline="middle" className="fill-ink font-mono text-xs font-semibold">{lastAcc} %</text>
        <text x={PAD.padL} y={H - 6} className="fill-ink-soft font-mono text-[11px]">{shortDate(points[0]!.endedAt)}</text>
        <text x={w - PAD.padR} y={H - 6} textAnchor="end" className="fill-ink-soft font-mono text-[11px]">{shortDate(points[n - 1]!.endedAt)}</text>
        {tip && <line x1={tip.x} x2={tip.x} y1={PAD.padT} y2={H - PAD.padB} stroke="var(--t-ink)" strokeOpacity={.35} strokeWidth={1} />}
      </svg>
      {tip && (
        <div aria-hidden="true" className="pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-lg border border-rule bg-vellum px-2.5 py-1.5 font-mono text-xs text-ink shadow-sm"
          style={tip.x < w / 2 ? { left: tip.x + 10 } : { right: w - tip.x + 10 }}>
          {shortDate(tip.p.endedAt)} · {tip.p.accuracy} %
        </div>
      )}
    </>
  );
}
