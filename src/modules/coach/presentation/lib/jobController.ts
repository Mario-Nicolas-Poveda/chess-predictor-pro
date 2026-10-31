import { ApiError } from '@/lib/apiClient';
import type { Polled } from '../api/coachApi';

/** Lo que la pantalla necesita saber de un trabajo del coach (análisis de una partida o plan). */
export type JobView<T> =
  | { kind: 'loading' }
  | { kind: 'none' }                                                    // 404: todavía no se pidió
  | { kind: 'pending'; data: T }                                        // en cola o haciéndose (puede traer el anterior)
  | { kind: 'ready'; data: T }
  | { kind: 'failed'; data: T }
  | { kind: 'unavailable'; code: string; message: string; meta?: Record<string, unknown> }   // 403 · 404 · 409 · 422
  | { kind: 'limited'; retryAfterS: number; last: T | null }            // 429 (con lo último que se vio, si había)
  | { kind: 'offline'; last: T | null };                                // red o 5xx: se reintenta solo

export interface JobApi<T> {
  get(etag: string | null, signal: AbortSignal): Promise<Polled<T>>;
  request(signal: AbortSignal): Promise<T>;
  remove?(): Promise<void>;
}
export interface JobOptions<T> {
  notFoundCode: string;                                  // 'REVIEW_NOT_FOUND' · 'SUMMARY_NOT_FOUND'
  auto?: boolean;                                        // pedirlo solo si no existe
  autoWhen?: (data: T) => boolean;                       // pedirlo otra vez si… (p. ej. el plan quedó viejo)
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (t: unknown) => void;
  isHidden?: () => boolean;
}

const BACKOFF = [1500, 3000, 6000, 10_000];
type Job = { status: 'pending' | 'ready' | 'failed'; pollAfterMs: number };

/**
 * Consulta un trabajo del coach con ETag hasta que termine. Sin React (se prueba con relojes falsos);
 * el hook solo se suscribe. `start`/`stop` se pueden repetir (Strict Mode monta dos veces en desarrollo).
 */
export class JobController<T extends Job> {
  private view: JobView<T> = { kind: 'loading' };
  private readonly listeners = new Set<() => void>();
  private etag: string | null = null;
  private timer: unknown = null;
  private ctrl = new AbortController();
  private running = false;
  private requesting = false;
  private autoTried = false;
  private fails = 0;
  private last: T | null = null;                         // lo último que llegó: no se pierde con un 429 o sin red
  private readonly set: (fn: () => void, ms: number) => unknown;
  private readonly clear: (t: unknown) => void;
  private readonly hidden: () => boolean;

  constructor(private readonly api: JobApi<T>, private readonly o: JobOptions<T>) {
    this.set = o.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clear = o.clearTimer ?? (t => clearTimeout(t as ReturnType<typeof setTimeout>));
    this.hidden = o.isHidden ?? (() => typeof document !== 'undefined' && document.hidden);
  }

  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  getSnapshot = () => this.view;

  start() {
    if (this.running) return;
    this.running = true;
    this.ctrl = new AbortController();
    void this.poll();
  }
  stop() {
    this.running = false;
    this.ctrl.abort();
    this.cancelTimer();
  }
  /** Al volver a la pestaña: si algo estaba en curso o sin red, consulta ya. */
  onVisible() {
    if (!this.running || this.timer !== null) return;
    if (this.view.kind === 'pending' || this.view.kind === 'offline') void this.poll();
  }

  request = async () => {
    if (this.requesting || !this.running) return;
    this.requesting = true;
    const signal = this.ctrl.signal;                       // si se desmonta en medio, la respuesta se ignora
    try {
      const data = await this.api.request(signal);
      if (signal.aborted) return;
      this.etag = null;                                    // el POST no trae ETag: la próxima consulta trae todo
      this.show(data);
    } catch (e) {
      if (!signal.aborted) this.showError(e, false);
    } finally {
      this.requesting = false;
    }
  };

  /** Borra y vuelve a pedir (DELETE 204 → POST). */
  reanalyze = async () => {
    if (!this.api.remove || !this.running) return;
    try {
      await this.api.remove();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'REVIEW_IN_PROGRESS') { this.cancelTimer(); void this.poll(); return; }
      if (!(e instanceof ApiError && e.status === 404)) { this.showError(e, false); return; }
    }
    await this.request();
  };

  private emit(v: JobView<T>) { this.view = v; for (const l of this.listeners) l(); }
  private cancelTimer() { if (this.timer !== null) { this.clear(this.timer); this.timer = null; } }
  private schedule(ms: number) { this.cancelTimer(); this.timer = this.set(() => { this.timer = null; void this.poll(); }, ms); }

  private show(data: T) {
    this.fails = 0;
    this.last = data;
    this.emit({ kind: data.status, data });
    if (data.status === 'pending') this.schedule(data.pollAfterMs || 1500);
    else if (this.o.autoWhen?.(data) && !this.autoTried) { this.autoTried = true; void this.request(); }
  }

  private showError(e: unknown, fromPoll: boolean) {
    if (e instanceof ApiError) {
      if (e.status === 429) return this.emit({ kind: 'limited', retryAfterS: Number(e.meta?.retryAfterS) || 60, last: this.last });
      if (e.status === 404 && e.code === this.o.notFoundCode) {
        if (this.o.auto && !this.autoTried) { this.autoTried = true; void this.request(); return; }
        return this.emit({ kind: 'none' });
      }
      if (e.status < 500) return this.emit({ kind: 'unavailable', code: e.code, message: e.message, meta: e.meta });
    }
    // Red caída o 5xx: se muestra "sin conexión" y se reintenta con espera creciente (solo las consultas)
    this.emit({ kind: 'offline', last: this.last });
    if (fromPoll) this.schedule(BACKOFF[Math.min(this.fails++, BACKOFF.length - 1)]!);
  }

  private async poll() {
    if (!this.running) return;
    if (this.hidden()) return;                             // se retoma con onVisible
    const signal = this.ctrl.signal;                       // de ESTE montaje: tras stop/start se ignora la respuesta vieja
    try {
      const r = await this.api.get(this.etag, signal);
      if (signal.aborted) return;
      if (r.kind === 'data') { this.etag = r.etag; this.show(r.data); }
      else if (this.view.kind === 'pending') this.schedule(this.view.data.pollAfterMs || 1500);
    } catch (e) {
      if (!signal.aborted) this.showError(e, true);
    }
  }
}
