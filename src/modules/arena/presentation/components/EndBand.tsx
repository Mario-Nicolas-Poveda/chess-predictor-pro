'use client';

import Link from 'next/link';
import * as m from 'motion/react-m';
import { buttonClass } from '@/components/ui/Button';
import { EASE_OUT } from '@/lib/motion';

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0');

/** Banda abajo en el escenario al terminar; entra a los 500 ms. */
export function EndBand({ title, reason, eloDelta, resultHref, onAgain }:
  { title: string; reason: string; eloDelta: number | null; resultHref?: string; onAgain: () => void }) {
  return (
    <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, delay: .5, ease: EASE_OUT }}
      className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 bg-paper/86 px-7 py-[22px] backdrop-blur-[10px]">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="eyebrow">
          Partida terminada{eloDelta !== null && <> · <span className={eloDelta > 0 ? 'text-accent' : ''}>{signed(eloDelta)} ELO</span></>}
        </p>
        <p className="font-display text-[52px] font-semibold leading-none tracking-[-.02em]">{title}</p>
        <p className="mt-1 text-[15px] text-ink-soft">{reason}</p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={onAgain} className={buttonClass('ghost')}>Jugar otra vez</button>
        {resultHref && <Link href={resultHref} className={buttonClass('primary')}>Ver resultado ›</Link>}
      </div>
    </m.div>
  );
}
