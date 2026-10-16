import type { NextRequest } from 'next/server';
import { signToken } from '@/core/shared/auth/jwt';
import { setSessionCookie } from '@/core/shared/auth/session';
import { toErrorResponse } from '@/core/shared/errors/toErrorResponse';
import { readJson } from '@/core/shared/http/readJson';
import { created } from '@/core/shared/http/responses';
import { RegisterSchema } from '@/modules/auth/infrastructure/dto/authSchemas';
import { registerUser } from '@/modules/auth/presentation/controllers/container';

export async function POST(req: NextRequest) {
  try {
    const user = await registerUser.execute(await readJson(req, RegisterSchema));
    const res = created({ user }, '/api/v1/auth/me');
    setSessionCookie(res, await signToken({ userId: user.id, username: user.username }));
    return res;
  } catch (e) { return toErrorResponse(e); }
}
