'use client';

import * as m from 'motion/react-m';
import { EASE_OUT } from '@/lib/motion';

export function GrowBar({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <m.span className={className} style={{ originX: 0 }} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }}
      viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE_OUT, delay }} />
  );
}
