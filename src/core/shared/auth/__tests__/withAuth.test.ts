import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../errors/AppError';
import { signToken } from '../jwt';
import { withAuth } from '../withAuth';

const TIMING = /^app;dur=\d+\.\d$/;
const ctx = { params: Promise.resolve({}) };
const anonymous = () => new NextRequest('http://localhost/api/v1/x');
const signedIn = async () => new NextRequest('http://localhost/api/v1/x', {
  headers: { authorization: `Bearer ${await signToken({ userId: 'u1', username: 'ana' })}` },
});

beforeEach(() => { vi.stubEnv('JWT_SECRET', 'secreto-de-prueba-con-mas-de-32-caracteres'); });

describe('withAuth', () => {
  it('pasa la sesión y dice cuánto tardó el servidor', async () => {
    const res = await withAuth(async (_req, s) => NextResponse.json({ user: s.userId }))(await signedIn(), ctx);
    expect(await res.json()).toEqual({ user: 'u1' });
    expect(res.headers.get('server-timing')).toMatch(TIMING);
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
});
