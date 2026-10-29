'use client';

import { useEffect, useRef, useState } from 'react';

/** Cuántas jugadas mostrar: llegan de golpe, pero se ven de una en una. Una recarga (salto > 2) no hace cola. */
export function useRevealed(total: number, gapMs = 600): number {
  const [revealed, setRevealed] = useState(total);
  const last = useRef(0);
  useEffect(() => {
    if (total < revealed) {                                // deshacer o recarga hacia atrás
      const t = setTimeout(() => setRevealed(total), 0);
      return () => clearTimeout(t);
    }
    if (total === revealed) return;
    const jump = total - revealed > 2;
    const wait = jump ? 0 : Math.max(0, last.current + gapMs - performance.now());
    const t = setTimeout(() => { last.current = performance.now(); setRevealed(jump ? total : revealed + 1); }, wait);
    return () => clearTimeout(t);
  }, [total, revealed, gapMs]);
  return Math.min(total, revealed);
}
