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

/**
 * Carga three y la escena después del primer pintado. `load` DEBE ser estable (definida fuera del componente):
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
    const id = whenIdle(async () => {
      try {
        const [factory, { detectQuality }] = await Promise.all([load(), import('./quality')]);
        if (!alive || !canvasRef.current) return;
        created = factory(canvasRef.current, { quality: detectQuality(), reducedMotion: reduce });
        setScene(created);
      } catch (e) {
        // sin WebGL o chunk que no cargó: la pantalla muestra su alternativa 2D
        console.error('[3d] no se pudo crear la escena', e);
        if (alive) setFailed(true);
      }
    });
    // StrictMode monta dos veces: la primera escena se libera aquí antes de crear la segunda
    return () => { alive = false; cancelIdle(id); created?.dispose(); setScene(null); };
  }, [load, reduce]);

  return { canvasRef, scene, failed };
}
