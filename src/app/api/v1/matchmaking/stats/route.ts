import { withAuth } from '@/core/shared/auth/withAuth';
import { ok } from '@/core/shared/http/responses';
import { getQueueStats } from '@/modules/matchmaking/presentation/controllers/container';

export const GET = withAuth(async () =>
  ok(await getQueueStats.execute(), { headers: { 'Cache-Control': 'no-store' } }));
