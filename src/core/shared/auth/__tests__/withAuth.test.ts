import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../errors/AppError';
import { signToken } from '../jwt';
import { notModified } from '../../http/etag';
import { withAuth } from '../withAuth';
import type { Role } from '../roles';

const alive = vi.hoisted(() => ({ fn: vi.fn<(id: string) => Promise<boolean>>(async () => true) }));
vi.mock('../guestAlive', () => ({ guestAlive: alive.fn }));

const TIMING = /^app;dur=\d+\.\d$/;
const ctx = { params: Promise.resolve({}) };
const anonymous = () => new NextRequest('http://localhost/api/v1/x');
const signedIn = async (role: Role = 'player') => new NextRequest('http://localhost/api/v1/x', {
  headers: { authorization: `Bearer ${await signToken({ userId: 'u1', username: 'ana', role })}` },
});

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', 'secreto-de-prueba-con-mas-de-32-caracteres');
  alive.fn.mockReset().mockResolvedValue(true);
});

describe('withAuth', () => {
  it('pasa la sesión y dice cuánto tardó el servidor', async () => {
    const res = await withAuth(async (_req, s) => NextResponse.json({ user: s.userId }))(await signedIn(), ctx);
    expect(await res.json()).toEqual({ user: 'u1' });
    expect(res.headers.get('server-timing')).toMatch(TIMING);
  });

  it('agrega su medición sin borrar la marca del 304', async () => {
    const res = await withAuth(async () => notModified({ ETag: '"m-2"' }))(await signedIn(), ctx);
    expect(res.status).toBe(304);
    expect(res.headers.get('server-timing')).toMatch(/^etag;desc="304", app;dur=\d+\.\d$/);
  });

  it('sin sesión → 401, también con la medición, y no llama al handler', async () => {
    const handler = vi.fn();
    const res = await withAuth(handler)(anonymous(), ctx);
    expect(res.status).toBe(401);
    expect(res.headers.get('server-timing')).toMatch(TIMING);
    expect(handler).not.toHaveBeenCalled();
  });

  it('un error del caso de uso conserva su código y la medición', async () => {
    const res = await withAuth(async () => { throw new ConflictError('STALE_PLY', 'La posición cambió'); })(await signedIn(), ctx);
    expect(res.status).toBe(409);
    expect(res.headers.get('server-timing')).toMatch(TIMING);
  });

  it('un 304 sin cuerpo también lleva la medición', async () => {
    const res = await withAuth(async () => new Response(null, { status: 304, headers: { ETag: '"m-1"' } }))(await signedIn(), ctx);
    expect(res.status).toBe(304);
    expect(res.headers.get('etag')).toBe('"m-1"');
    expect(res.headers.get('server-timing')).toMatch(TIMING);
  });

  it('medir no rompe un redirect, que tiene las cabeceras inmutables', async () => {
    const res = await withAuth(async () => Response.redirect('http://localhost/login'))(await signedIn(), ctx);
    expect(res.status).toBe(302);
  });

  describe('roles (cerrado por defecto)', () => {
    const ok = async (_req: NextRequest, s: { role: Role }) => NextResponse.json({ role: s.role });

    it('un invitado en una ruta sin marcar → 403 ACCOUNT_REQUIRED y no llama al handler', async () => {
      const handler = vi.fn();
      const res = await withAuth(handler)(await signedIn('guest'), ctx);
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe('ACCOUNT_REQUIRED');
      expect(handler).not.toHaveBeenCalled();
    });

    it("un invitado vivo en una ruta { allow: 'any' } → pasa con role guest", async () => {
      const res = await withAuth(ok, { allow: 'any' })(await signedIn('guest'), ctx);
      expect(await res.json()).toEqual({ role: 'guest' });
      expect(alive.fn).toHaveBeenCalledWith('u1');
    });

    it('un invitado ya borrado → 401 SESSION_EXPIRED aunque su token siga firmado', async () => {
      alive.fn.mockResolvedValue(false);
      const res = await withAuth(ok, { allow: 'any' })(await signedIn('guest'), ctx);
      expect(res.status).toBe(401);
      expect((await res.json()).error.code).toBe('SESSION_EXPIRED');
    });

    it('un jugador entra a las dos y no consulta la BD', async () => {
      expect((await withAuth(ok)(await signedIn(), ctx)).status).toBe(200);
      expect((await withAuth(ok, { allow: 'any' })(await signedIn(), ctx)).status).toBe(200);
      expect(alive.fn).not.toHaveBeenCalled();
    });
  });
});
