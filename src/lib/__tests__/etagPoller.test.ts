import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/apiClient';
import { EtagPoller, type Polled, type PollView } from '@/lib/etagPoller';

type D = { v: number; poll: number };
type Answer = Polled<D> | Error | (() => Promise<Polled<D>>);
const flush = () => vi.advanceTimersByTimeAsync(0);
const data = (v: number, poll = 1000): Polled<D> => ({ kind: 'data', data: { v, poll }, etag: `"e${v}"` });

function setup(answers: Answer[]) {
  const calls: (string | null)[] = [];
  const views: PollView<D>[] = [];
  const p = new EtagPoller<D>({
    fetch: async etag => {
      calls.push(etag);
      const a = (answers.length > 1 ? answers.shift() : answers[0]) as Answer;
      if (typeof a === 'function') return a();
      if (a instanceof Error) throw a;
      return a;
    },
    pollAfter: d => d.poll,
    onChange: v => views.push(v),
  });
  return { p, calls, views };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('EtagPoller', () => {
  it('la primera sin ETag, las siguientes con él; un 304 no cambia el dato', async () => {
    const { p, calls, views } = setup([data(1), { kind: 'not-modified' }]);
    p.start(); await flush();
    await vi.advanceTimersByTimeAsync(1000);
    expect(calls).toEqual([null, '"e1"']);
    expect(views.at(-1)).toEqual({ data: { v: 1, poll: 1000 }, loading: false, problem: null });
    p.stop();
  });

  it('pollAfter 0 → no sigue; refresh() la despierta', async () => {
    const { p, calls } = setup([data(1, 0)]);
    p.start(); await flush();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toHaveLength(1);
    await p.refresh();
    expect(calls).toHaveLength(2);
  });

  it('tres refresh() con una en vuelo → una sola consulta más', async () => {
    let release = () => {};
    const slow = () => new Promise<Polled<D>>(r => { release = () => r(data(1, 0)); });
    const { p, calls } = setup([slow, data(2, 0)]);
    p.start(); await flush();
    void p.refresh(); void p.refresh(); void p.refresh();
    release(); await flush(); await flush();
    expect(calls).toHaveLength(2);
  });

  it('sin red: offline, conserva el dato y reintenta a los 5 s; al volver, problem null', async () => {
    const { p, calls, views } = setup([data(1, 0), new TypeError('Failed to fetch'), data(2, 0)]);
    p.start(); await flush();
    await p.refresh();
    expect(views.at(-1)).toMatchObject({ data: { v: 1 }, problem: 'offline' });
    await vi.advanceTimersByTimeAsync(5000);
    expect(calls).toHaveLength(3);
    expect(views.at(-1)).toMatchObject({ data: { v: 2 }, problem: null });
  });

  it('429 espera retryAfterS', async () => {
    const { p, calls, views } = setup([new ApiError(429, 'RATE_LIMITED', 'x', undefined, { retryAfterS: 30 }), data(1, 0)]);
    p.start(); await flush();
    expect(views.at(-1)?.problem).toBe('rate-limited');
    await vi.advanceTimersByTimeAsync(29_000);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(calls).toHaveLength(2);
  });

  it('404 → not-found y para', async () => {
    const { p, calls, views } = setup([new ApiError(404, 'TOURNAMENT_NOT_FOUND', 'x')]);
    p.start(); await flush();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toHaveLength(1);
    expect(views.at(-1)?.problem).toBe('not-found');
  });

  it('pestaña oculta: no consulta en 60 s; al volver, consulta ya', async () => {
    const { p, calls } = setup([data(1, 1000)]);
    p.start(); await flush();
    p.setHidden(true);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toHaveLength(1);
    p.setHidden(false); await flush();
    expect(calls).toHaveLength(2);
    p.stop();
  });

  it('stop() aborta la que está en vuelo y no emite', async () => {
    const signals: AbortSignal[] = [];
    const views: PollView<D>[] = [];
    const p = new EtagPoller<D>({
      fetch: (_e, signal) => {
        signals.push(signal);
        return new Promise((_, ko) => signal.addEventListener('abort', () => ko(new DOMException('Aborted', 'AbortError'))));
      },
      pollAfter: () => 0, onChange: v => views.push(v),
    });
    p.start(); await flush();
    p.stop(); await flush();
    expect(signals[0]?.aborted).toBe(true);
    expect(views).toHaveLength(0);
  });

  it('Strict Mode (start → stop → start): vuelve a consultar y muestra el dato', async () => {
    const { p, calls, views } = setup([data(1, 0)]);
    p.start(); p.stop(); p.start(); await flush();
    expect(calls).toHaveLength(2);
    expect(views.at(-1)).toMatchObject({ data: { v: 1 }, loading: false });
  });

  it('replace() muestra sin consultar y la siguiente va sin ETag', async () => {
    const { p, calls, views } = setup([data(1, 0)]);
    p.start(); await flush();
    p.replace({ v: 9, poll: 0 });
    expect(views.at(-1)?.data?.v).toBe(9);
    await p.refresh();
    expect(calls).toEqual([null, null]);
  });
});
