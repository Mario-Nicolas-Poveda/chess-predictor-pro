import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signToken } from '@/core/shared/auth/jwt';
import { setSessionCookie } from '@/core/shared/auth/session';
import type { Role } from '@/core/shared/auth/roles';
import { POST } from '../route';

const h = vi.hoisted(() => ({ drop: vi.fn(async () => {}) }));
vi.mock('@/modules/auth/presentation/controllers/container', () => ({ dropGuest: { execute: h.drop } }));
// fuera de una petición de Next no hay after(): se corre en el momento
vi.mock('@/core/shared/http/background', () => ({ afterResponse: (_label: string, fn: () => Promise<unknown>) => fn() }));

const req = async (role?: Role) => new NextRequest('http://localhost/api/v1/auth/logout', {
  method: 'POST',
  headers: role ? { authorization: `Bearer ${await signToken({ userId: 'u1', username: 'ana', role })}` } : {},
});

beforeEach(() => { vi.stubEnv('JWT_SECRET', 'secreto-de-prueba-con-mas-de-32-caracteres'); h.drop.mockClear(); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('POST /auth/logout', () => {
  it('204 sin cuerpo, no-store y la cookie borrada con los mismos atributos con que se creó', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = await POST(await req());
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    expect(res.headers.get('cache-control')).toBe('no-store');

    const created = NextResponse.json({});
    setSessionCookie(created, 't');
    const attrsOf = (r: NextResponse) => { const c = r.cookies.get('cpp_session')!; return [c.path, c.domain, c.secure, c.sameSite, c.httpOnly]; };
    expect(attrsOf(res)).toEqual(attrsOf(created));
    expect(res.cookies.get('cpp_session')).toMatchObject({ value: '', maxAge: 0, secure: true, sameSite: 'lax', httpOnly: true });
    expect(h.drop).not.toHaveBeenCalled();
  });

  it('un invitado se borra al salir; un jugador no', async () => {
    expect((await POST(await req('guest'))).status).toBe(204);
    expect(h.drop).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', role: 'guest' }));
    h.drop.mockClear();
    expect((await POST(await req('player'))).status).toBe(204);
    expect(h.drop).not.toHaveBeenCalled();
  });
});
