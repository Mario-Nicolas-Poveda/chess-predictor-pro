import { withAuth } from '@/core/shared/auth/withAuth';
import { ok } from '@/core/shared/http/responses';
import { getMatchmakingStatus } from '@/modules/matchmaking/presentation/controllers/container';

export const GET = withAuth(async (_req, s) =>
  ok(await getMatchmakingStatus.execute(s.userId), { headers: { 'Cache-Control': 'no-store' } }));
