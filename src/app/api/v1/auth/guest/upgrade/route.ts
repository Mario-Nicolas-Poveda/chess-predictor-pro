import { NextResponse } from 'next/server';
import { signToken } from '@/core/shared/auth/jwt';
import { setSessionCookie } from '@/core/shared/auth/session';
import { withAuth } from '@/core/shared/auth/withAuth';
import { readJson } from '@/core/shared/http/readJson';
import { GuestUpgradeSchema } from '@/modules/auth/infrastructure/dto/sessionSchemas';
import { upgradeGuest } from '@/modules/auth/presentation/controllers/container';

// de invitado a jugador en la misma fila: 200 · 400 · 401 · 409 · 415
export const POST = withAuth(async (req, s) => {
  const user = await upgradeGuest.execute(s, await readJson(req, GuestUpgradeSchema));
  const res = NextResponse.json({ user });
  setSessionCookie(res, await signToken({ userId: user.id, username: user.username, role: 'player' }));
  return res;
}, { allow: 'any' });
