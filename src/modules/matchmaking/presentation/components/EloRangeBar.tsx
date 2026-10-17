'use client';

import * as m from 'motion/react-m';
import { SPRING_SOFT } from '@/lib/motion';

// Pista de 1000 a 2000. La banda mide ±400 (80 %) centrada en tu ELO y se escala con scaleX: solo transform.
export function EloRangeBar({ elo, range }: { elo: number; range: { min: number; max: number } }) {
  const center = Math.min(100, Math.max(0, (elo - 1000) / 10));
  return (
    <div className="flex max-w-[460px] flex-col gap-2.5">
      <p className="flex justify-between text-caption text-ink-soft">
        <span>Rango de ELO</span>
        <span className="font-semibold text-ink nums">{range.min} – {range.max}</span>
      </p>
      <div className="relative h-2 rounded bg-rule">
        <div className="absolute inset-0 overflow-hidden rounded">
          <m.span className="absolute inset-y-0 rounded bg-accent/35" style={{ left: `${center - 40}%`, width: '80%', originX: 0.5 }}
            initial={false} animate={{ scaleX: (range.max - range.min) / 800 }} transition={SPRING_SOFT} />
        </div>
        <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-[3px] ring-paper" style={{ left: `${center}%` }} />
      </div>
      <p aria-hidden="true" className="flex justify-between font-mono text-[11px] text-ink-faint"><span>1000</span><span>1500</span><span>2000</span></p>
    </div>
  );
}
