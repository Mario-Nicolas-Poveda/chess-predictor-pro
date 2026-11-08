import { NextResponse } from 'next/server';
import { withAuth } from '@/core/shared/auth/withAuth';
import { getMe } from '@/modules/auth/presentation/controllers/container';

export const GET = withAuth(async (_req, s) => NextResponse.json({ user: await getMe.execute(s.userId) }), { allow: 'any' });
