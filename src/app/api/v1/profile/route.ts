import { NextResponse } from 'next/server';
import { signToken } from '@/core/shared/auth/jwt';
import { setSessionCookie } from '@/core/shared/auth/session';
import { withAuth } from '@/core/shared/auth/withAuth';
import { winRate, type User } from '@/modules/dashboard/domain/User';
import { UpdateProfileSchema, type Profile } from '@/modules/dashboard/infrastructure/dto/profileSchemas';
import { getUserProfile, updateUserProfile } from '@/modules/dashboard/presentation/controllers/container';

const toDto = (p: User): Profile => ({ ...p, stats: { ...p.stats, winRate: winRate(p.stats) } });

export const GET = withAuth(async (_req, s) =>
  NextResponse.json({ profile: toDto(await getUserProfile.execute(s.userId)) }));

export const PATCH = withAuth(async (req, s) => {
  const p = await updateUserProfile.execute(s.userId, UpdateProfileSchema.parse(await req.json().catch(() => null)));
  const res = NextResponse.json({ profile: toDto(p) });
  if (p.username !== s.username)   // el username va dentro del JWT → reemitir
    setSessionCookie(res, await signToken({ userId: p.id, username: p.username }));
  return res;
});
