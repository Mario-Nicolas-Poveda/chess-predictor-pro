import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken } from '@/core/shared/auth/jwt';
import { SESSION_COOKIE } from '@/core/shared/auth/session';

export async function proxy(req: NextRequest) {
  const s = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/dashboard') && !s)
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url));
  if ((pathname === '/login' || pathname === '/register') && s)
    return NextResponse.redirect(new URL('/dashboard/profile', req.url));
  return NextResponse.next();
}
export const config = { matcher: ['/dashboard/:path*', '/login', '/register'] };
