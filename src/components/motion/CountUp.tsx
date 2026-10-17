'use client';

import { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';
import { EASE_OUT } from '@/lib/motion';

const plain = (n: number) => String(Math.round(n));

// Cuenta escribiendo en el DOM: sin re-render por frame. Servidor y cliente pintan el valor final
// (igual con o sin "reducir movimiento", y correcto sin JavaScript); la cuenta empieza al entrar en vista.
export function CountUp({ to, from = 0, duration = 1.2, format = plain, className }:
  { to: number; from?: number; duration?: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || reduce) return;
    const c = animate(from, to, { duration, ease: EASE_OUT, onUpdate: v => { el.textContent = format(v); } });
    return () => c.stop();
  }, [inView, reduce, from, to, duration, format]);
  return <span ref={ref} className={className} aria-label={format(to)}>{format(to)}</span>;
}
