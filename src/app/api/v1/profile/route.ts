import { NextResponse } from 'next/server';
import { signToken } from '@/core/shared/auth/jwt';
import { setSessionCookie } from '@/core/shared/auth/session';
import { withAuth } from '@/core/shared/auth/withAuth';
import { readJson } from '@/core/shared/http/readJson';
import { winRate, type User } from '@/modules/dashboard/domain/User';
import { DEFAULT_PREFERENCES } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';
import { UpdateProfileSchema, type Profile } from '@/modules/dashboard/infrastructure/dto/profileSchemas';
import { getUserProfile, updateUserProfile } from '@/modules/dashboard/presentation/controllers/container';

// shortcut: preferencias por defecto para todos, hasta que la Fase 5 (#28) las lea de la BD
const toDto = (p: User): Profile =>
  ({ ...p, stats: { ...p.stats, winRate: winRate(p.stats) }, preferences: DEFAULT_PREFERENCES });

export const GET = withAuth(async (_req, s) =>
  NextResponse.json({ profile: toDto(await getUserProfile.execute(s.userId)) }));

export const PATCH = withAuth(async (req, s) => {
  const p = await updateUserProfile.execute(s.userId, await readJson(req, UpdateProfileSchema));
  const res = NextResponse.json({ profile: toDto(p) });
  if (p.username !== s.username)   // el username va dentro del JWT → reemitir
    setSessionCookie(res, await signToken({ userId: p.id, username: p.username }));
  return res;
});
