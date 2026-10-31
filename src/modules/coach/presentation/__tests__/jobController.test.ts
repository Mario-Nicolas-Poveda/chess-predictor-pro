import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/apiClient';
import type { Polled } from '../api/coachApi';
import { JobController, type JobApi, type JobOptions } from '../lib/jobController';

type Job = { status: 'pending' | 'ready' | 'failed'; pollAfterMs: number; stale?: boolean; id?: number };
const pending: Job = { status: 'pending', pollAfterMs: 1500 };
const ready: Job = { status: 'ready', pollAfterMs: 0 };
const failed: Job = { status: 'failed', pollAfterMs: 0 };
const data = (d: Job, etag: string | null = '"rv-2"'): Polled<Job> => ({ kind: 'data', data: d, etag });
const notFound = () => new ApiError(404, 'REVIEW_NOT_FOUND', 'no');
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

/** API falso (cada GET saca una respuesta de la cola) y relojes falsos. */
function setup(gets: (Polled<Job> | Error)[], o: Partial<JobOptions<Job>> & { posts?: (Job | Error)[] } = {}) {
  const log: string[] = [], timers = new Map<number, { fn: () => void; ms: number }>();
  let nextTimer = 0, hidden = false;
  const posts = o.posts ?? [pending];
  const api: JobApi<Job> = {
    async get(etag) {
      log.push(etag ? `GET ${etag}` : 'GET');
      const r = gets.shift() ?? { kind: 'not-modified' as const };
      if (r instanceof Error) throw r;
      return r;
    },
    async request() {
      log.push('POST');
      const r = posts.shift() ?? ready;
      if (r instanceof Error) throw r;
      return r;
    },
    remove: async () => { log.push('DELETE'); },
  };
  const ctl = new JobController<Job>(api, {
    notFoundCode: 'REVIEW_NOT_FOUND', ...o,
    setTimer: (fn, ms) => { timers.set(++nextTimer, { fn, ms }); return nextTimer; },
    clearTimer: t => { timers.delete(t as number); },
    isHidden: () => hidden,
  });
  const views: string[] = [];
  ctl.subscribe(() => views.push(ctl.getSnapshot().kind));
  /** Vence el timer pendiente. */
  const tick = async () => {
    const [id, t] = [...timers][0]!;
    timers.delete(id);
    t.fn();
    await flush();
    return t.ms;
  };
  return { ctl, log, views, timers, tick, setHidden: (v: boolean) => { hidden = v; } };
}

describe('JobController', () => {
  it('auto: 404 → POST → consulta con etag hasta listo', async () => {
    const t = setup([notFound(), data(pending), { kind: 'not-modified' }, data(ready)], { auto: true });
    t.ctl.start(); await flush();
    await t.tick(); await t.tick(); await t.tick();
    expect(t.log).toEqual(['GET', 'POST', 'GET', 'GET "rv-2"', 'GET "rv-2"']);
    expect(t.views).toEqual(['pending', 'pending', 'ready']);
  });

  it('listo → sin más timers', async () => {
    const t = setup([data(ready)]);
    t.ctl.start(); await flush();
    expect(t.timers.size).toBe(0);
  });

  it('sin auto, 404 → none', async () => {
    const t = setup([notFound()]);
    t.ctl.start(); await flush();
    expect(t.ctl.getSnapshot().kind).toBe('none');
    expect(t.log).toEqual(['GET']);
  });

  it('request con 422 → unavailable con el código', async () => {
    const t = setup([notFound()], { posts: [new ApiError(422, 'GAME_TOO_SHORT', 'corta', undefined, { minPlies: 6 })] });
    t.ctl.start(); await flush();
    await t.ctl.request();
    expect(t.ctl.getSnapshot()).toMatchObject({ kind: 'unavailable', code: 'GAME_TOO_SHORT', meta: { minPlies: 6 } });
  });

  it('request con 429 → limited con retryAfterS', async () => {
    const t = setup([notFound()], { posts: [new ApiError(429, 'RATE_LIMITED', 'límite', undefined, { retryAfterS: 3600 })] });
    t.ctl.start(); await flush();
    await t.ctl.request();
    expect(t.ctl.getSnapshot()).toEqual({ kind: 'limited', retryAfterS: 3600, last: null });
  });

  it('403 → unavailable', async () => {
    const t = setup([new ApiError(403, 'FORBIDDEN', 'no')]);
    t.ctl.start(); await flush();
    expect(t.ctl.getSnapshot()).toMatchObject({ kind: 'unavailable', code: 'FORBIDDEN' });
  });

  it('sin red → offline y reintenta a 1,5 s y 3 s, luego listo', async () => {
    const t = setup([new TypeError('Failed to fetch'), new TypeError('Failed to fetch'), data(ready)]);
    t.ctl.start(); await flush();
    expect(t.ctl.getSnapshot().kind).toBe('offline');
    expect(await t.tick()).toBe(1500);
    expect(await t.tick()).toBe(3000);
    expect(t.ctl.getSnapshot().kind).toBe('ready');
  });

  it('un 500 también es offline', async () => {
    const t = setup([new ApiError(500, 'INTERNAL', 'x'), data(ready)]);
    t.ctl.start(); await flush();
    expect(t.ctl.getSnapshot().kind).toBe('offline');
  });

  it('pestaña oculta: el timer vence sin consultar y al volver consulta ya', async () => {
    const t = setup([data(pending), data(ready)]);
    t.ctl.start(); await flush();
    t.setHidden(true);
    await t.tick();
    expect(t.log).toEqual(['GET']);
    t.setHidden(false);
    t.ctl.onVisible(); await flush();
    expect(t.log).toHaveLength(2);
    expect(t.ctl.getSnapshot().kind).toBe('ready');
  });

  it('start, stop, start: sigue con un solo timer', async () => {
    const t = setup([data(pending), data(pending)]);
    t.ctl.start(); await flush();
    t.ctl.stop();
    t.ctl.start(); await flush();
    expect(t.timers.size).toBe(1);
  });

  it('stop: ni timers ni consultas', async () => {
    const t = setup([data(pending)]);
    t.ctl.start(); await flush();
    t.ctl.stop();
    expect(t.timers.size).toBe(0);
    t.ctl.onVisible(); await flush();
    expect(t.log).toEqual(['GET']);
  });

  it('una respuesta vieja se ignora tras stop', async () => {
    const t = setup([data(ready)]);
    t.ctl.start();
    t.ctl.stop(); await flush();
    expect(t.ctl.getSnapshot().kind).toBe('loading');
  });

  it('failed → request → pending → listo, sin el etag viejo', async () => {
    const t = setup([data(failed), data(ready, '"rv-3"')]);
    t.ctl.start(); await flush();
    expect(t.ctl.getSnapshot().kind).toBe('failed');
    await t.ctl.request();
    expect(t.ctl.getSnapshot().kind).toBe('pending');
    await t.tick();
    expect(t.log).toEqual(['GET', 'POST', 'GET']);
    expect(t.ctl.getSnapshot().kind).toBe('ready');
  });

  it('volver a analizar: DELETE y POST', async () => {
    const t = setup([data(ready)]);
    t.ctl.start(); await flush();
    await t.ctl.reanalyze();
    expect(t.log).toEqual(['GET', 'DELETE', 'POST']);
  });

  it('plan viejo: un POST y luego listo', async () => {
    const stale: Job = { ...ready, stale: true };
    const t = setup([data(stale), data(ready)], { autoWhen: d => d.status === 'ready' && !!d.stale });
    t.ctl.start(); await flush();
    await t.tick();
    expect(t.log.filter(l => l === 'POST')).toHaveLength(1);
    expect(t.ctl.getSnapshot().kind).toBe('ready');
  });

  it('plan viejo con 429: limited conserva el plan anterior', async () => {
    const stale: Job = { ...ready, stale: true };
    const t = setup([data(stale)], { autoWhen: d => !!d.stale, posts: [new ApiError(429, 'RATE_LIMITED', 'x', undefined, { retryAfterS: 60 })] });
    t.ctl.start(); await flush();
    expect(t.ctl.getSnapshot()).toEqual({ kind: 'limited', retryAfterS: 60, last: stale });
  });

  it('sin red conserva lo último que se vio', async () => {
    const t = setup([data(pending), new TypeError('Failed to fetch')]);
    t.ctl.start(); await flush();
    await t.tick();
    expect(t.ctl.getSnapshot()).toEqual({ kind: 'offline', last: pending });
  });

  it('doble clic en analizar: un solo POST', async () => {
    const t = setup([notFound()]);
    t.ctl.start(); await flush();
    void t.ctl.request(); void t.ctl.request(); await flush();
    expect(t.log.filter(l => l === 'POST')).toHaveLength(1);
  });

  it('avisa a los suscritos y deja de hacerlo al desuscribirse', async () => {
    const t = setup([data(ready)]);
    const l = vi.fn(), off = t.ctl.subscribe(l);
    off();
    t.ctl.start(); await flush();
    expect(l).not.toHaveBeenCalled();
  });
});
