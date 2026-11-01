export interface FlagWatchOptions {
  refresh: () => Promise<{ status: string } | null>;   // la última respuesta del servidor
  delayMs?: number;
  tries?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (t: unknown) => void;
}

/**
 * Cuando un reloj llega a 0 en pantalla: pide el estado ya y, si el servidor todavía no cerró la partida
 * (su reloj va unos milisegundos detrás), reintenta cada `delayMs`, hasta `tries` veces. Devuelve cómo cancelarlo.
 */
export function watchFlag(o: FlagWatchOptions): () => void {
  const delay = o.delayMs ?? 500, tries = o.tries ?? 5;
  const set = o.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clear = o.clearTimer ?? (t => clearTimeout(t as ReturnType<typeof setTimeout>));
  let cancelled = false, timer: unknown = null, attempt = 0;

  const tick = async () => {
    timer = null;
    if (cancelled) return;
    attempt++;
    let status: string | null = null;
    try { status = (await o.refresh())?.status ?? null; } catch { /* sin red: se reintenta igual */ }
    if (cancelled || (status && status !== 'active' && status !== 'pending')) return;
    if (attempt < tries) timer = set(tick, delay);
  };
  void tick();
  return () => { cancelled = true; if (timer !== null) clear(timer); };
}
