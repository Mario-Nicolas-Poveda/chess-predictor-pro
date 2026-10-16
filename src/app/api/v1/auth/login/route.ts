import { NextResponse, type NextRequest } from 'next/server';
import { signToken } from '@/core/shared/auth/jwt';
import { setSessionCookie } from '@/core/shared/auth/session';
import { toErrorResponse } from '@/core/shared/errors/toErrorResponse';
import { readJson } from '@/core/shared/http/readJson';
import { LoginSchema } from '@/modules/auth/infrastructure/dto/authSchemas';
import { loginUser } from '@/modules/auth/presentation/controllers/container';

export async function POST(req: NextRequest) {
  try {
    const user = await loginUser.execute(await readJson(req, LoginSchema));
    const res = NextResponse.json({ user }, { status: 200 });
    setSessionCookie(res, await signToken({ userId: user.id, username: user.username }));
    return res;
  } catch (e) { return toErrorResponse(e); }
}
