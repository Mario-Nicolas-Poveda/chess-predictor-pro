'use client';

import type { ReactNode } from 'react';
import * as m from 'motion/react-m';
import { EASE_OUT } from '@/lib/motion';

export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }}>{children}</m.div>;
}
