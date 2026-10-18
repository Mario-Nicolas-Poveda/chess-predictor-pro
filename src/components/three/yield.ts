/** Devuelve el control al navegador entre pasos pesados (input, pintado). */
export function yieldToMain(): Promise<void> {
  const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (s?.yield) return s.yield();
  return new Promise(resolve => setTimeout(resolve, 0));
}
export const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve));

export class SceneAborted extends Error { constructor() { super('scene-aborted'); } }
export function checkAbort(signal: AbortSignal) { if (signal.aborted) throw new SceneAborted(); }

/** Sin WebGL con GPU: la pantalla usa su alternativa 2D. Vive aquí (sin three) para no arrastrarlo al hook. */
export class SoftwareWebGL extends Error { constructor() { super('software-webgl'); } }
