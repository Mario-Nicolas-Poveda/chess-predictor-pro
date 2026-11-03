import { NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setSessionCookie } from '@/core/shared/auth/session';
import { POST } from '../route';

afterEach(() => { vi.unstubAllEnvs(); });

describe('POST /auth/logout', () => {
  it('204 sin cuerpo, no-store y la cookie borrada con los mismos atributos con que se creó', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = await POST();
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    expect(res.headers.get('cache-control')).toBe('no-store');

    const created = NextResponse.json({});
    setSessionCookie(created, 't');
    const attrsOf = (r: NextResponse) => { const c = r.cookies.get('cpp_session')!; return [c.path, c.domain, c.secure, c.sameSite, c.httpOnly]; };
    expect(attrsOf(res)).toEqual(attrsOf(created));
    expect(res.cookies.get('cpp_session')).toMatchObject({ value: '', maxAge: 0, secure: true, sameSite: 'lax', httpOnly: true });
  });
});
