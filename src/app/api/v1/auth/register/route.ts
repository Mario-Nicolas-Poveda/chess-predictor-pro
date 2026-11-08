import type { NextRequest } from 'next/server';
import { signToken, verifyToken } from '@/core/shared/auth/jwt';
import { readToken, setSessionCookie } from '@/core/shared/auth/session';
import { afterResponse } from '@/core/shared/http/background';
import { toErrorResponse } from '@/core/shared/errors/toErrorResponse';
import { clientIp } from '@/core/shared/http/clientIp';
import { readJson } from '@/core/shared/http/readJson';
import { created } from '@/core/shared/http/responses';
import { RegisterSchema } from '@/modules/auth/infrastructure/dto/authSchemas';
import { registerUser, dropGuest } from '@/modules/auth/presentation/controllers/container';

export async function POST(req: NextRequest) {
  const prev = await verifyToken(readToken(req));
  try {
    const user = await registerUser.execute(await readJson(req, RegisterSchema), clientIp(req));
    const res = created({ user }, '/api/v1/auth/me');
    setSessionCookie(res, await signToken({ userId: user.id, username: user.username, role: 'player' }));
    // entrar con otra cuenta encima de un invitado lo borra (ya no tiene cómo volver)
    afterResponse('guest-drop', () => dropGuest.execute(prev, user.id));
    return res;
  } catch (e) { return toErrorResponse(e); }
}
