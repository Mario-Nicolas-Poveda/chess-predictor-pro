'use client';

import { sanEs } from '@/components/chess/san';
import type { Prediction } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';

const pct = (white: number) => Math.round(white * 100);

/** Barra de ventaja junto al tablero: marfil (blancas) que crece desde tu lado. */
export function EvalBar({ white, fromBottom }: { white: number; fromBottom: boolean }) {
  const w = pct(white);
  return (
    <div role="meter" aria-label="Ventaja" aria-valuemin={0} aria-valuemax={100} aria-valuenow={w} aria-valuetext={`Blancas ${w} %, negras ${100 - w} %`}
      className={`relative flex w-3 shrink-0 overflow-hidden rounded-full bg-ink ${fromBottom ? 'flex-col-reverse' : 'flex-col'}`}>
      <span className="w-full bg-[#f3ead9] shadow-[inset_0_0_0_1px_var(--t-rule)] transition-[height] duration-700 ease-[cubic-bezier(.22,1,.36,1)]" style={{ height: `${w}%` }} />
      <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-accent" />
    </div>
  );
}

/** Tarjeta "Predicción": ventaja y tus 3 mejores jugadas; cursor o foco → flecha, tocar → flecha fija. */
export function PredictionPanel({ prediction, yourTurn, pinned, onHover, onPin }: {
  prediction: Prediction | null; yourTurn: boolean; pinned: string | null;
  onHover: (uci: string | null) => void; onPin: (uci: string) => void;
}) {
  const w = prediction ? pct(prediction.white) : 50;
  return (
    <section aria-labelledby="pred-title" className="flex flex-col gap-3 rounded-[22px] bg-vellum p-5 shadow-[inset_0_0_0_1px_var(--t-rule)]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="pred-title" className="font-mono text-[11px] font-normal uppercase tracking-[.14em] text-ink-faint">Predicción</h2>
        <span className="font-mono text-xs nums">{prediction ? `Blancas ${w} % · Negras ${100 - w} %` : 'Calculando…'}</span>
      </div>
      <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-ink">
        <div className="h-full bg-[#f3ead9] shadow-[inset_0_0_0_1px_var(--t-rule)] transition-[width] duration-700" style={{ width: `${w}%` }} />
      </div>
      <p className="mt-1 font-medium">Tus mejores jugadas</p>
      {/* siempre 3 filas de alto: sin saltos al cargar o en el turno de la IA */}
      <ul className="flex min-h-[132px] flex-col gap-1.5">
        {!yourTurn ? <li className="text-ink-soft">Se actualiza en tu turno.</li>
          : !prediction ? [0, 1, 2].map(i => <li key={i} aria-hidden="true" className="h-10 animate-pulse rounded-xl bg-band" />)
          : prediction.top.map(m => (
            <li key={m.uci}>
              <button type="button" aria-pressed={pinned === m.uci} onClick={() => onPin(m.uci)}
                onMouseEnter={() => onHover(m.uci)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(m.uci)} onBlur={() => onHover(null)}
                className="grid h-10 w-full grid-cols-[64px_1fr_48px] items-center gap-3 rounded-xl px-3 text-left hover:bg-band aria-pressed:bg-band focus-visible:outline-2 focus-visible:outline-accent">
                <span className="font-mono text-[15px] font-medium">{sanEs(m.san)}</span>
                <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-band"><span className="block h-full rounded-full bg-accent" style={{ width: `${m.pct}%` }} /></span>
                <span className="text-right font-mono text-sm nums">{m.pct} %</span>
              </button>
            </li>
          ))}
      </ul>
      <p className="text-[13px] text-ink-soft">Pasa el cursor o toca una jugada para ver la flecha en el tablero.</p>
    </section>
  );
}
