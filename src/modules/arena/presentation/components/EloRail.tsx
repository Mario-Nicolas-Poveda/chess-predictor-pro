'use client';

import * as m from 'motion/react-m';
import { EASE_OUT } from '@/lib/motion';

/** Pista de antes y después: punto hueco en `before`, el lleno se desliza hasta `after` (solo transform). */
export function EloRail({ before, after }: { before: number; after: number }) {
  const min = Math.floor((Math.min(before, after) - 50) / 10) * 10, max = Math.ceil((Math.max(before, after) + 50) / 10) * 10;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const a = pct(before), b = pct(after);
  const t = { duration: 1.2, delay: .5, ease: EASE_OUT };
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-rule" />
        {/* tramo entre los dos al 35 %: crece desde before */}
        <m.div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent/35"
          style={{ left: `${Math.min(a, b)}%`, width: `${Math.abs(b - a)}%`, originX: b >= a ? 0 : 1 }}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={t} />
        <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-soft bg-paper" style={{ left: `${a}%` }} />
        {/* la capa ocupa toda la pista: su translateX en % es el % de la pista */}
        <m.div className="absolute inset-0" initial={{ x: `${a}%` }} animate={{ x: `${b}%` }} transition={t}>
          <span className="absolute left-0 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
        </m.div>
      </div>
      <div className="flex justify-between font-mono text-xs text-ink-faint nums"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}
