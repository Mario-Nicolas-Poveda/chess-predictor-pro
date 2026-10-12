import { NextResponse, connection, type NextRequest } from 'next/server';
import { env } from '@/core/shared/env';
import { googleRedirectUri } from '@/modules/auth/infrastructure/GoogleOAuthClient';

export async function GET(req: NextRequest) {
  // Cache Components: sin esto Next prerenderizaría la ruta en el build con un state fijo
  await connection();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET)
    return NextResponse.redirect(new URL('/login?error=oauth', req.url));

  const state = crypto.randomUUID();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID, response_type: 'code', scope: 'openid email profile',
    redirect_uri: googleRedirectUri(), state, prompt: 'select_account',
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set('oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600,
    secure: process.env.NODE_ENV === 'production' });
  return res;
}
