/**
 * Cuando llega una hora del servidor (inicio del torneo, plazo de la primera jugada): consulta ya y,
 * si el servidor todavía no cambió (su reloj va unos milisegundos detrás), reintenta cada `delayMs`,
 * hasta `tries` veces. Igual que watchFlag (Sprint 5), pero programado para una hora concreta.
 * `skewMs` = hora del servidor − hora del navegador (de `serverNow`).
 */
export interface DeadlineOptions {
  at: string;                                   // ISO
  skewMs: number;
  refresh: () => Promise<boolean>;              // true = el servidor ya cambió
  delayMs?: number;
  tries?: number;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (t: unknown) => void;
}

export function afterDeadline(o: DeadlineOptions): () => void {
  const delay = o.delayMs ?? 1000, tries = o.tries ?? 5, now = o.now ?? Date.now;
  const set = o.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clear = o.clearTimer ?? (t => clearTimeout(t as ReturnType<typeof setTimeout>));
  let cancelled = false, timer: unknown = null, attempt = 0;

  const tick = async () => {
    timer = null;
    if (cancelled) return;
    attempt++;
    let done = false;
    try { done = await o.refresh(); } catch { /* sin red: se reintenta igual */ }
    if (!cancelled && !done && attempt < tries) timer = set(tick, delay);
  };
  // +250 ms: que el servidor ya haya pasado la hora cuando llegue la consulta
  const wait = Math.max(0, Date.parse(o.at) - (now() + o.skewMs) + 250);
  timer = set(tick, Math.min(wait, 2 ** 31 - 1));
  return () => { cancelled = true; if (timer !== null) clear(timer); };
}

/** 4:32 · 59 s · 1 h 05 min · 2 d 3 h */
export function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')} min`;
  return `${Math.floor(s / 86_400)} d ${Math.floor((s % 86_400) / 3600)} h`;
}
