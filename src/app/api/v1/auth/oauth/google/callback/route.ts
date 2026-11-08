import { NextResponse, type NextRequest } from 'next/server';
import { signToken, verifyToken } from '@/core/shared/auth/jwt';
import { readToken, setSessionCookie } from '@/core/shared/auth/session';
import { afterResponse } from '@/core/shared/http/background';
import { googleOAuthClient, loginWithGoogle, dropGuest } from '@/modules/auth/presentation/controllers/container';

export async function GET(req: NextRequest) {
  const fail = NextResponse.redirect(new URL('/login?error=oauth', req.url));
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  if (!code || !state || state !== req.cookies.get('oauth_state')?.value) return fail;   // anti-CSRF
  const prev = await verifyToken(readToken(req));
  try {
    const g = await googleOAuthClient.exchange(code);
    if (!g.email_verified) return fail;
    const user = await loginWithGoogle.execute(g);
    const res = NextResponse.redirect(new URL('/dashboard/profile', req.url));
    setSessionCookie(res, await signToken({ userId: user.id, username: user.username, role: 'player' }));
    // entrar con otra cuenta encima de un invitado lo borra (ya no tiene cómo volver)
    afterResponse('guest-drop', () => dropGuest.execute(prev, user.id));
    res.cookies.set('oauth_state', '', { path: '/', maxAge: 0 });
    return res;
  } catch (e) { console.error(e); return fail; }
}
