import { ApiError } from '@/lib/apiClient';

/** Lo que devuelve una consulta con ETag: datos nuevos o 304. */
export type Polled<T> = { kind: 'data'; data: T; etag: string | null } | { kind: 'not-modified' };

export type PollProblem = 'offline' | 'rate-limited' | 'not-found' | 'error';
export interface PollView<T> { data: T | null; loading: boolean; problem: PollProblem | null }

export interface EtagPollerOptions<T> {
  fetch: (etag: string | null, signal: AbortSignal) => Promise<Polled<T>>;
  pollAfter: (data: T) => number;          // 0 = no seguir consultando (el timbre o poke() despiertan)
  onChange: (v: PollView<T>) => void;
  retryMs?: number;                        // sin red: reintenta cada 5 s
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (t: unknown) => void;
}

/**
 * Consulta con ETag sin React: guarda el último dato y el ETag, programa la siguiente según `pollAfter`,
 * junta pedidos que llegan mientras otro está en vuelo (uno más al terminar, no veinte) y se pausa
 * cuando la pestaña no se ve (ahorra CPU de Vercel). Un 404 para; un 429 espera `Retry-After`; sin red,
 * reintenta y conserva el último dato.
 */
export class EtagPoller<T> {
  private data: T | null = null;
  private etag: string | null = null;
  private problem: PollProblem | null = null;
  private loading = true;
  private timer: unknown = null;
  private inFlight: AbortController | null = null;
  private again = false;
  private paused = false;
  private stopped = false;
  private readonly set: (fn: () => void, ms: number) => unknown;
  private readonly clear: (t: unknown) => void;

  constructor(private readonly o: EtagPollerOptions<T>) {
    this.set = o.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clear = o.clearTimer ?? (t => clearTimeout(t as ReturnType<typeof setTimeout>));
  }

  /** Se puede llamar otra vez después de stop() (Strict Mode monta, desmonta y vuelve a montar). */
  start() { this.stopped = false; void this.refresh(); }

  stop() {
    this.stopped = true;
    this.unschedule();
    this.inFlight?.abort();
    this.inFlight = null;          // la abortada ya no cuenta: un start() posterior consulta de nuevo
    this.again = false;
  }

  /** Pestaña oculta: no consulta. Al volver: consulta ya. */
  setHidden(hidden: boolean) {
    this.paused = hidden;
    if (hidden) this.unschedule();
    else void this.refresh();
  }

  /** Consultar ya (timbre, plazo vencido, tras inscribirse…). Si hay una en vuelo, se repite al terminar. */
  async refresh(): Promise<void> {
    if (this.stopped || this.paused) return;
    if (this.inFlight) { this.again = true; return; }
    this.unschedule();
    const ctl = new AbortController();
    this.inFlight = ctl;
    let next: number | null = null;
    try {
      const r = await this.o.fetch(this.etag, ctl.signal);
      if (ctl.signal.aborted) return;
      if (r.kind === 'data') { this.data = r.data; this.etag = r.etag; }
      this.problem = null;
      next = this.data ? this.o.pollAfter(this.data) : null;
    } catch (e) {
      if (ctl.signal.aborted) return;
      if (e instanceof ApiError && e.status === 404) { this.problem = 'not-found'; next = null; }
      else if (e instanceof ApiError && e.status === 429) { this.problem = 'rate-limited'; next = Number(e.meta?.retryAfterS ?? 30) * 1000; }
      else if (e instanceof ApiError) { this.problem = 'error'; next = this.o.retryMs ?? 5000; }
      else { this.problem = 'offline'; next = this.o.retryMs ?? 5000; }      // TypeError de fetch: sin red
    } finally {
      if (this.inFlight === ctl) this.inFlight = null;
    }
    this.loading = false;
    this.emit();
    if (this.again) { this.again = false; void this.refresh(); return; }
    if (next && !this.stopped && !this.paused) this.timer = this.set(() => { this.timer = null; void this.refresh(); }, next);
  }

  /** Para actualizar sin consultar (por ejemplo, con la respuesta de inscribirse). */
  replace(data: T) { this.data = data; this.etag = null; this.emit(); }

  private unschedule() { if (this.timer !== null) { this.clear(this.timer); this.timer = null; } }
  private emit() { this.o.onChange({ data: this.data, loading: this.loading, problem: this.problem }); }
}
