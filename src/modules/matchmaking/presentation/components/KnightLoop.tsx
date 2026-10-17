'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { SPRING_HOP } from '@/lib/motion';

const PATH = [[0, 0], [1, 2], [3, 3], [2, 1], [0, 2], [1, 0], [3, 1], [2, 3]] as const;   // cada paso es una jugada de caballo

// Alternativa 2D del escenario cuando no hay WebGL.
export function KnightLoop() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setStep(s => (s + 1) % 14), 700);   // va y vuelve por el camino
    return () => clearInterval(id);
  }, [reduce]);
  const [c, r] = PATH[step < 8 ? step : 14 - step]!;
  return (
    <div aria-hidden="true" className="relative grid aspect-square w-full max-w-[600px] grid-cols-4 overflow-hidden rounded-[28px]">
      {Array.from({ length: 16 }, (_, i) => (
        <span key={i} className={(Math.floor(i / 4) + (i % 4)) % 2 ? 'bg-[#c9b08e]' : 'bg-[#efe4d3]'} />
      ))}
      <m.span className="absolute left-0 top-0 flex size-1/4 items-center justify-center"
        animate={{ x: `${c * 100}%`, y: `${r * 100}%` }} transition={SPRING_HOP}>
        <span className="font-chess text-[clamp(40px,8vw,96px)] leading-none text-[#2a1417]">{'♞︎'}</span>
      </m.span>
    </div>
  );
}
