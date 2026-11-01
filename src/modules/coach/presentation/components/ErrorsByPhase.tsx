'use client';

import { useState } from 'react';
import type { SummaryStats } from '@/modules/coach/infrastructure/dto/coachSchemas';
import { ChartFigure } from './ChartFigure';

const PHASES = [
  { key: 'opening', label: 'Apertura' }, { key: 'middlegame', label: 'Medio juego' }, { key: 'endgame', label: 'Final' },
] as const;
const errors = (n: number) => `${n} ${n === 1 ? 'error' : 'errores'}`;

/** Dónde te equivocas: el valor va escrito encima de cada barra, por eso no hay eje y. */
export function ErrorsByPhase({ data }: { data: SummaryStats['errorsByPhase'] }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...PHASES.map(p => data[p.key]));
  const graph = (
    <div>
      <div className="grid h-[168px] grid-cols-3 border-b border-rule">
        {PHASES.map(p => {
          const n = data[p.key];
          return (
            <div key={p.key} role="img" aria-label={`${p.label}: ${errors(n)}`} className="relative flex flex-col items-center justify-end gap-1.5"
              onPointerEnter={() => setHover(p.key)} onPointerLeave={() => setHover(null)} onPointerDown={() => setHover(p.key)}>
              {hover === p.key && (
                <span aria-hidden="true" className="absolute top-0 z-10 whitespace-nowrap rounded-lg border border-rule bg-vellum px-2.5 py-1.5 font-mono text-xs shadow-sm">{p.label}: {errors(n)}</span>
              )}
              <span className="font-mono text-xs font-medium">{n}</span>
              <span className="w-6 rounded-t bg-accent" style={{ height: max ? (n / max) * 112 : 0 }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-3 text-center font-mono text-xs font-medium">
        {PHASES.map(p => <span key={p.key} className={max && data[p.key] === max ? 'text-ink' : 'text-ink-soft'}>{p.label}</span>)}
      </div>
    </div>
  );
  const table = (
    <table className="w-full border-collapse font-mono text-xs">
      <caption className="sr-only">Imprecisiones, errores y errores graves por fase</caption>
      <thead><tr className="text-left text-ink-soft"><th scope="col" className="p-2 font-medium">Fase</th><th scope="col" className="p-2 text-right font-medium">Errores</th></tr></thead>
      <tbody>
        {PHASES.map(p => <tr key={p.key} className="border-t border-rule"><td className="p-2">{p.label}</td><td className="p-2 text-right">{data[p.key]}</td></tr>)}
      </tbody>
    </table>
  );
  return <ChartFigure title="Dónde te equivocas" graph={graph} table={table} />;
}
