import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, toApiError } from '@/lib/apiClient';
import { guestExpiryText, guestStartError, startGuest, upgradeGuest } from '../api/guestApi';
import { Locked, PlayersOnly } from '../components/Locked';
import { upgradeError } from '../components/UpgradeDialog';
import { accountDialogClosed, askAccount, onAccountRequired, requireAccount } from '../lib/accountRequired';
import { __resetLogout } from '../logout';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const err = (status: number, code: string, extra: object = {}) => json(status, { error: { code, message: code, ...extra } });
const USER = { id: 'g', email: null, username: 'invitado_e77213', displayName: 'Invitado', avatarUrl: null, elo: 1200, role: 'guest', guestExpiresAt: '2026-11-15T03:00:00.000Z' };

afterEach(() => { vi.unstubAllGlobals(); accountDialogClosed(); });

describe('guestApi', () => {
  it('201 → created: true · 200 → created: false', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(201, { user: USER })));
    expect(await startGuest()).toEqual({ created: true, user: USER });
    vi.stubGlobal('fetch', vi.fn(async () => json(200, { user: USER })));
    expect((await startGuest()).created).toBe(false);
  });

  it('textos de error de "Jugar sin cuenta"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => err(429, 'RATE_LIMITED', { meta: { retryAfterS: 1800 } })));
    expect(guestStartError(await startGuest().catch(e => e))).toBe('Se crearon muchos invitados desde tu red. Prueba en 30 min o crea tu cuenta.');
    vi.stubGlobal('fetch', vi.fn(async () => err(503, 'GUEST_CAPACITY')));
    expect(guestStartError(await startGuest().catch(e => e))).toBe('Ahora no hay cupo para invitados. Crea tu cuenta: es gratis.');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect(guestStartError(await startGuest().catch(e => e))).toBe('Sin conexión. Reintenta en un momento.');
  });

  it('convertir: 409 EMAIL_TAKEN llega con fields', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => err(409, 'EMAIL_TAKEN', { fields: { email: ['Ese correo ya tiene cuenta'] } })));
    await expect(upgradeGuest({ email: 'a@b.co', username: 'ana', password: 'abc12345' }))
      .rejects.toMatchObject({ status: 409, fields: { email: ['Ese correo ya tiene cuenta'] } });
  });

  it('la fecha de borrado va en hora de Bogotá', () => {
    expect(guestExpiryText('2026-11-15T03:00:00.000Z')).toBe('Tu partida de invitado se borra el sáb 14 nov');
  });
});

describe('un solo diálogo para crear la cuenta', () => {
  it('tres avisos a la vez → un diálogo; al cerrarlo, otro puede abrir', () => {
    const fn = vi.fn();
    const off = onAccountRequired(fn);
    requireAccount({ message: 'a' }); requireAccount({ message: 'b' }); askAccount('coach');
    expect(fn).toHaveBeenCalledExactlyOnceWith({ message: 'a' });
    accountDialogClosed();
    askAccount('coach');
    expect(fn).toHaveBeenLastCalledWith({ feature: 'coach', message: 'Crea tu cuenta para usar el entrenador.' });
    off();
  });

  it('sin diálogo montado no se queda "abierto"', () => {
    requireAccount({ message: 'x' });
    const fn = vi.fn();
    const off = onAccountRequired(fn);
    requireAccount({ message: 'y' });
    expect(fn).toHaveBeenCalledOnce();
    off();
  });
});

describe('cliente HTTP', () => {
  let fn: ReturnType<typeof vi.fn<(r: { message: string }) => void>>;
  let off: () => void;
  beforeEach(() => { fn = vi.fn<(r: { message: string }) => void>(); off = onAccountRequired(fn); __resetLogout(); });
  afterEach(() => off());

  it('403 ACCOUNT_REQUIRED abre el diálogo y la pantalla recibe el error; otro 403 no', async () => {
    const e = await toApiError(err(403, 'ACCOUNT_REQUIRED'));
    expect(e).toMatchObject({ status: 403, code: 'ACCOUNT_REQUIRED' });
    expect(fn).toHaveBeenCalledOnce();
    accountDialogClosed();
    await toApiError(err(403, 'FORBIDDEN'));
    expect(fn).toHaveBeenCalledOnce();
  });

  it('403 ACCOUNT_REQUIRED no redirige; 401 SESSION_EXPIRED lleva a /login?expired=guest', async () => {
    const replace = vi.fn();
    vi.stubGlobal('window', { location: { pathname: '/dashboard/coach', replace } });
    vi.stubGlobal('fetch', vi.fn(async () => err(403, 'ACCOUNT_REQUIRED')));
    await expect(apiFetch('/coach/summary')).rejects.toBeInstanceOf(ApiError);
    expect(replace).not.toHaveBeenCalled();
    vi.stubGlobal('fetch', vi.fn(async () => err(401, 'SESSION_EXPIRED')));
    await expect(apiFetch('/auth/me')).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    expect(replace).toHaveBeenCalledExactlyOnceWith('/login?expired=guest');
  });
});

describe('candados', () => {
  const child = <a href="/dashboard/play">Jugar</a>;
  it('jugador (o la sesión aún no llega) → el enlace tal cual; invitado → botón con candado', () => {
    expect(renderToStaticMarkup(<Locked role="player" feature="playOnline" label="Jugar">{child}</Locked>)).toBe('<a href="/dashboard/play">Jugar</a>');
    expect(renderToStaticMarkup(<Locked role={null} feature="playOnline" label="Jugar">{child}</Locked>)).toBe('<a href="/dashboard/play">Jugar</a>');
    const html = renderToStaticMarkup(<Locked role="guest" feature="playOnline" label="Jugar">{child}</Locked>);
    expect(html).toMatch(/^<button type="button" aria-label="Jugar · requiere cuenta"/);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('href');
  });

  it('página solo para cuentas: nada mientras carga, el panel para el invitado', () => {
    expect(renderToStaticMarkup(<PlayersOnly role={null} feature="coach"><p>coach</p></PlayersOnly>)).toBe('');
    expect(renderToStaticMarkup(<PlayersOnly role="player" feature="coach"><p>coach</p></PlayersOnly>)).toBe('<p>coach</p>');
    const html = renderToStaticMarkup(<PlayersOnly role="guest" feature="coach"><p>coach</p></PlayersOnly>);
    expect(html).toContain('Esto es para cuentas');
    expect(html).toContain('Crea tu cuenta para usar el entrenador.');
    expect(html).not.toContain('<p>coach</p>');
  });
});

describe('errores al crear la cuenta', () => {
  it('fields → en su campo · ALREADY_REGISTERED → recarga · 401 → aviso arriba', () => {
    const setError = vi.fn();
    upgradeError(new ApiError(409, 'EMAIL_TAKEN', 'x', { email: ['Ese correo ya tiene cuenta'] }), setError);
    expect(setError).toHaveBeenCalledWith('email', { message: 'Ese correo ya tiene cuenta' });
    expect(upgradeError(new ApiError(409, 'ALREADY_REGISTERED', 'x'), setError)).toBe('reload');
    upgradeError(new ApiError(401, 'SESSION_EXPIRED', 'x'), setError);
    expect(setError).toHaveBeenLastCalledWith('root', { message: 'Tu sesión de invitado terminó. Crea tu cuenta desde el inicio.' });
  });
});
