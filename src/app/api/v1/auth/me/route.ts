import { NextResponse } from 'next/server';
import { withAuth } from '@/core/shared/auth/withAuth';

export const GET = withAuth(async (_req, s) => NextResponse.json({ user: { id: s.userId, username: s.username } }));
