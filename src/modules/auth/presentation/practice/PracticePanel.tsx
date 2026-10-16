'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';

// Mismo tamaño que el tablero + las candidatas: nada salta cuando carga el 3D.
const Placeholder = () => (
  <>
    <div aria-hidden="true" className="aspect-square w-full max-w-[600px] rounded-[28px] bg-[#e6d9c4]" />
    <div aria-hidden="true" className="h-[172px] w-full max-w-[600px]" />
  </>
);
const PracticeBoard3D = dynamic(() => import('./PracticeBoard3D'), { ssr: false, loading: Placeholder });

const query = '(min-width: 1024px)';
const subscribe = (cb: () => void) => { const mq = matchMedia(query); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb); };
const isDesktop = () => matchMedia(query).matches;

/** Panel "Mientras entras" del login y el registro. En móvil (< 1024 px) no se muestra ni se descarga three ni chess.js. */
export function PracticePanel() {
  const desktop = useSyncExternalStore(subscribe, isDesktop, () => false);
  const [failed, setFailed] = useState(false);
  const onFail = useCallback(() => setFailed(true), []);
  if (failed) return null;   // sin WebGL el formulario ocupa toda la pantalla

  return (
    <section aria-labelledby="board-title"
      className="hidden min-w-0 flex-[1_1_620px] flex-col items-center justify-center gap-[22px] bg-[#eee4d4] px-[clamp(24px,4vw,64px)] py-12 lg:flex">
      <div className="flex w-full max-w-[600px] flex-col gap-2 animate-rise">
        <p className="eyebrow">Mientras entras</p>
        <h2 id="board-title" className="font-display text-[44px] font-semibold leading-[1.04] tracking-[-.015em]">Mueven las blancas.</h2>
        <p className="text-[15px] text-ink-soft">Toca una pieza blanca y luego su casilla, o juega una de las jugadas más probables.</p>
      </div>
      {desktop ? <PracticeBoard3D onFail={onFail} /> : <Placeholder />}
    </section>
  );
}
