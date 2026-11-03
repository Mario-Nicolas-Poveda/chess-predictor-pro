import type { NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE = 'cpp_session';
const MAX_AGE = 60 * 60 * 24 * 7;

// borrar con los mismos atributos con que se creó, o el navegador puede guardar dos
const attrs = () => ({ httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' } as const);

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, { ...attrs(), maxAge: MAX_AGE });
}
export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', { ...attrs(), maxAge: 0 });
}
// cookie (navegador) o Bearer (curl/Postman)
export function readToken(req: NextRequest) {
  const h = req.headers.get('authorization');
  if (h?.startsWith('Bearer ')) return h.slice(7);
  return req.cookies.get(SESSION_COOKIE)?.value ?? null;
}
