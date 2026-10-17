'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { Quality } from './quality';

export type SceneFactory<S> = (canvas: HTMLCanvasElement, ctx: { quality: Quality; reducedMotion: boolean }) => S;
type Disposable = { dispose(): void };

const whenIdle = (fn: () => void): number =>
  'requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 1200 }) : self.setTimeout(fn, 250);
const cancelIdle = (id: number) =>
  'cancelIdleCallback' in window ? window.cancelIdleCallback(id) : self.clearTimeout(id);

const ENGAGE = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
const FALLBACK_MS = 3000;

/** Espera la primera interacción (o 3 s sin ella) y luego un momento ocioso: el 3D no compite con la carga de la página. */
function whenEngaged(fn: () => void) {
  let idle = 0;
  const go = () => { stop(); idle = whenIdle(fn); };
  const timer = self.setTimeout(go, FALLBACK_MS);
  const stop = () => { self.clearTimeout(timer); ENGAGE.forEach(e => window.removeEventListener(e, go)); };
  ENGAGE.forEach(e => window.addEventListener(e, go, { passive: true }));
  return () => { stop(); if (idle) cancelIdle(idle); };
}

/**
 * Carga three y la escena después del primer pintado, con la primera interacción. `load` DEBE ser estable (definida fuera del componente):
 *   const loadPractice = () => import('./scenes/practiceScene').then(m => m.createPracticeScene);
 */
export function useThreeScene<S extends Disposable>(load: () => Promise<SceneFactory<S>>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState<S | null>(null);
  const [failed, setFailed] = useState(false);
  const reduce = !!useReducedMotion();

  useEffect(() => {
    let alive = true;
    let created: S | null = null;
    const cancel = whenEngaged(async () => {
      try {
        const [factory, { detectQuality }] = await Promise.all([load(), import('./quality')]);
        if (!alive || !canvasRef.current) return;
        created = factory(canvasRef.current, { quality: detectQuality(), reducedMotion: reduce });
        setScene(created);
      } catch (e) {
        // sin WebGL o chunk que no cargó: la pantalla muestra su alternativa 2D
        console.warn('[3d] sin escena 3D, se usa la alternativa', e);
        if (alive) setFailed(true);
      }
    });
    // StrictMode monta dos veces: la primera escena se libera aquí antes de crear la segunda
    return () => { alive = false; cancel(); created?.dispose(); setScene(null); };
  }, [load, reduce]);

  return { canvasRef, scene, failed };
}
