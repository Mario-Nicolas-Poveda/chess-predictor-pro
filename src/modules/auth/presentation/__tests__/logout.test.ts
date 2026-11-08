import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetLogout, logout, onUnauthorized } from '../logout';

beforeEach(() => { __resetLogout(); vi.stubGlobal('window', { location: { pathname: '/dashboard/arena/m1' } }); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('logout', () => {
  it('dos clics a la vez → un POST y una navegación', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const nav = vi.fn();
    await Promise.all([logout(nav), logout(nav)]);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(nav).toHaveBeenCalledExactlyOnceWith('/login');
  });

  it('sin red → igual navega', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const nav = vi.fn();
    await logout(nav);
    expect(nav).toHaveBeenCalledWith('/login');
  });

  it('servidor colgado → navega a los 5 s', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_u: string, init: RequestInit) => new Promise((_, rej) =>
      init.signal!.addEventListener('abort', () => rej(init.signal!.reason)))));
    const nav = vi.fn();
    const done = logout(nav);
    await vi.advanceTimersByTimeAsync(4999);
    expect(nav).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(nav).toHaveBeenCalledWith('/login');
  });

  it('onUnauthorized dos veces → una navegación con next', () => {
    const nav = vi.fn();
    onUnauthorized(undefined, nav); onUnauthorized(undefined, nav);
    expect(nav).toHaveBeenCalledExactlyOnceWith('/login?next=%2Fdashboard%2Farena%2Fm1');
  });

  it('invitado vencido (401 SESSION_EXPIRED) → /login?expired=guest, sin next', () => {
    const nav = vi.fn();
    onUnauthorized('SESSION_EXPIRED', nav);
    expect(nav).toHaveBeenCalledExactlyOnceWith('/login?expired=guest');
  });

  it('el invitado sale a la landing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
    const nav = vi.fn();
    await logout(nav, '/');
    expect(nav).toHaveBeenCalledWith('/');
  });
});
