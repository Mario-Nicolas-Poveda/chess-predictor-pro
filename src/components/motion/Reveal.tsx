'use client';

import type { ReactNode } from 'react';
import * as m from 'motion/react-m';
import { fadeUp } from '@/lib/motion';

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <m.div className={className} variants={fadeUp} initial="hidden" whileInView="show"
      viewport={{ once: true, margin: '-10% 0px' }} transition={{ delay }}>
      {children}
    </m.div>
  );
}
