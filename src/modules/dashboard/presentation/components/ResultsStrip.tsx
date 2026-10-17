'use client';

import * as m from 'motion/react-m';
import { EASE_OUT } from '@/lib/motion';

export type GameResult = { id: string; result: 'win' | 'loss' | 'draw'; opponent: string; date: string };

const LABEL = { win: 'Victoria', loss: 'Derrota', draw: 'Tablas' } as const;
const EMPTY = 34;

// Una barra por partida, de la más antigua a hoy; crecen escalonadas con scaleY.
export function ResultsStrip({ results }: { results: GameResult[] }) {
  if (!results.length) return (
    <div>
      <div aria-hidden="true" className="flex h-[72px] items-end gap-2">
        {Array.from({ length: EMPTY }, (_, i) => <span key={i} className="h-0.5 flex-1 bg-rule" />)}
      </div>
      <p className="mt-4 text-ink-soft">Aquí aparecerá cada partida que juegues.</p>
    </div>
  );

  const wins = results.filter(r => r.result === 'win').length;
  const losses = results.filter(r => r.result === 'loss').length;
  return (
    <div>
      <m.div role="img" aria-label={`Últimas ${results.length} partidas: ${wins} victorias, ${losses} derrotas`}
        className="flex h-[72px] items-end gap-2"
        initial="hidden" whileInView="show" viewport={{ once: true, margin: '-10% 0px' }}
        variants={{ show: { transition: { staggerChildren: 0.025 } } }}>
        {results.map(r => (
          <m.span key={r.id} title={`${LABEL[r.result]} contra ${r.opponent} · ${r.date}`}
            className={`flex-1 rounded-[3px] ${r.result === 'win' ? 'bg-accent' : 'bg-loss'}`}
            style={{ height: r.result === 'win' ? 72 : r.result === 'draw' ? 48 : 30, originY: 1 }}
            variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 0.6, ease: EASE_OUT } } }} />
        ))}
      </m.div>
      <p aria-hidden="true" className="mt-3 flex justify-between font-mono text-[11px] text-ink-faint"><span>Más antigua</span><span>Hoy</span></p>
    </div>
  );
}
