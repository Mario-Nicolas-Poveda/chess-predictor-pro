import type { NextRequest } from 'next/server';
import { verifyToken } from '@/core/shared/auth/jwt';
import { clearSessionCookie, readToken } from '@/core/shared/auth/session';
import { afterResponse } from '@/core/shared/http/background';
import { noContent } from '@/core/shared/http/responses';
import { dropGuest } from '@/modules/auth/presentation/controllers/container';

// sin withAuth: 204 siempre, también sin sesión o con la cookie vencida
export async function POST(req: NextRequest) {
  const s = await verifyToken(readToken(req));
  // el invitado no tiene cómo volver a entrar: se borra con sus partidas
  if (s?.role === 'guest') afterResponse('guest-drop', () => dropGuest.execute(s));
  const res = noContent();
  res.headers.set('Cache-Control', 'no-store');
  clearSessionCookie(res);
  return res;
}
