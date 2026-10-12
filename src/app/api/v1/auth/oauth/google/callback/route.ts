import { NextResponse, type NextRequest } from 'next/server';
import { signToken } from '@/core/shared/auth/jwt';
import { setSessionCookie } from '@/core/shared/auth/session';
import { googleOAuthClient, loginWithGoogle } from '@/modules/auth/presentation/controllers/container';

export async function GET(req: NextRequest) {
  const fail = NextResponse.redirect(new URL('/login?error=oauth', req.url));
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  if (!code || !state || state !== req.cookies.get('oauth_state')?.value) return fail;   // anti-CSRF
  try {
    const g = await googleOAuthClient.exchange(code);
    if (!g.email_verified) return fail;
    const user = await loginWithGoogle.execute(g);
    const res = NextResponse.redirect(new URL('/dashboard/profile', req.url));
    setSessionCookie(res, await signToken({ userId: user.id, username: user.username }));
    res.cookies.set('oauth_state', '', { path: '/', maxAge: 0 });
    return res;
  } catch (e) { console.error(e); return fail; }
}
