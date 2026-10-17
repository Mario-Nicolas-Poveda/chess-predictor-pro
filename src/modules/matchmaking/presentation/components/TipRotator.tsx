'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';

const TIPS = [
  'Desarrolla caballos antes que alfiles.',
  'Enroca pronto: el rey seguro juega mejor.',
  'Controla el centro con peones y piezas.',
  'Antes de mover, pregúntate qué amenaza el rival.',
];

export function TipRotator() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI(n => (n + 1) % TIPS.length), 6000);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="mt-1 min-h-14 max-w-[460px] font-display text-[21px] italic text-ink-soft">
      <AnimatePresence mode="wait" initial={false}>
        <m.span key={i} className="block" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .35 }}>
          {TIPS[i]}
        </m.span>
      </AnimatePresence>
    </p>
  );
}
