'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { deviceQuality, noHardwareGL, type Quality } from './quality';
import { SceneAborted, SoftwareWebGL, checkAbort } from './yield';

export type SceneCtx = { quality: Quality; reducedMotion: boolean; signal: AbortSignal };
/** Las fábricas crean la escena por pasos (ceden el hilo) y se cortan con `signal` si se sale de la página. */
export type SceneFactory<S> = (canvas: HTMLCanvasElement, ctx: SceneCtx) => Promise<S>;
type Disposable = { dispose(): void };

const ENGAGE = ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'] as const;

/**
 * Equipos modestos (móvil): con la CPU lenta, crear la escena cuesta segundos y competiría con la carga.
 * Se espera al primer toque, tecla o scroll (o a 6 s sin ellos). shortcut: si el usuario no interactúa, ve el fondo 6 s.
 */
const whenEngaged = (signal: AbortSignal) => new Promise<void>(resolve => {
  const go = () => { clearTimeout(t); resolve(); };
  const t = setTimeout(go, 6000);
  ENGAGE.forEach(e => window.addEventListener(e, go, { once: true, passive: true, signal }));
  signal.addEventListener('abort', () => clearTimeout(t));
});

const whenIdle = (fn: () => void, timeout: number) =>
  'requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout }) : self.setTimeout(fn, 250);

/**
 * Carga three y la escena tras el `load` de la página y un momento libre (más tarde en equipos modestos).
 * `load` DEBE ser estable (definida fuera del componente):
 *   const loadPractice = () => import('./scenes/practiceScene').then(m => m.createPracticeScene);
 */
export function useThreeScene<S extends Disposable>(load: () => Promise<SceneFactory<S>>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState<S | null>(null);
  const [failed, setFailed] = useState(false);
  const reduce = !!useReducedMotion();

  useEffect(() => {
    const ctrl = new AbortController();
    let created: S | null = null;
    const pre = deviceQuality();
    const whenLoaded = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise<void>(r => window.addEventListener('load', () => r(), { once: true, signal: ctrl.signal }));
    whenLoaded
      .then(() => (pre === 'low' ? whenEngaged(ctrl.signal) : undefined))
      .then(() => new Promise<void>(r => whenIdle(r, pre === 'low' ? 2500 : 1200)))
      .then(async () => {
        checkAbort(ctrl.signal);
        if (await noHardwareGL()) throw new SoftwareWebGL();   // sin GPU: alternativa 2D, sin descargar three
        checkAbort(ctrl.signal);
        const factory = await load();
        checkAbort(ctrl.signal);
        if (!canvasRef.current) throw new SceneAborted();
        created = await factory(canvasRef.current, { quality: pre, reducedMotion: reduce, signal: ctrl.signal });
        if (ctrl.signal.aborted) { created.dispose(); return; }
        setScene(created);
      })
      .catch(e => {
        if (e instanceof SceneAborted || ctrl.signal.aborted) return;
        if (e instanceof SoftwareWebGL) { setFailed(true); return; }   // decisión esperada, no un error
        // sin WebGL o chunk que no cargó: la pantalla muestra su alternativa 2D
        console.warn('[3d] sin escena 3D, se usa la alternativa', e);
        setFailed(true);
      });
    // StrictMode monta dos veces: la primera creación se corta aquí antes de empezar la segunda
    return () => { ctrl.abort(); created?.dispose(); setScene(null); };
  }, [load, reduce]);

  return { canvasRef, scene, failed };
}
