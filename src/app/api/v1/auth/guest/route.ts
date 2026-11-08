import { NextResponse, type NextRequest } from 'next/server';
import { guestAlive } from '@/core/shared/auth/guestAlive';
import { signToken, verifyToken } from '@/core/shared/auth/jwt';
import { readToken, setSessionCookie } from '@/core/shared/auth/session';
import { toErrorResponse } from '@/core/shared/errors/toErrorResponse';
import { clientIp } from '@/core/shared/http/clientIp';
import { created } from '@/core/shared/http/responses';
import { createGuest, getMe } from '@/modules/auth/presentation/controllers/container';

// la puerta de entrada del invitado: sin withAuth. 201 nuevo · 200 si ya tenías sesión · 429 · 503
export async function POST(req: NextRequest) {
  try {
    const current = await verifyToken(readToken(req));
    if (current && (current.role === 'player' || await guestAlive(current.userId)))
      return NextResponse.json({ user: await getMe.execute(current.userId) });   // no crea otro
    const user = await createGuest.execute(clientIp(req));
    const res = created({ user }, '/api/v1/auth/me');
    setSessionCookie(res, await signToken({ userId: user.id, username: user.username, role: 'guest' }));
    return res;
  } catch (e) { return toErrorResponse(e); }
}
