import type { NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE = 'cpp_session';
const MAX_AGE = 60 * 60 * 24 * 7;

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
}
export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}
// cookie (navegador) o Bearer (curl/Postman)
export function readToken(req: NextRequest) {
  const h = req.headers.get('authorization');
  if (h?.startsWith('Bearer ')) return h.slice(7);
  return req.cookies.get(SESSION_COOKIE)?.value ?? null;
}
