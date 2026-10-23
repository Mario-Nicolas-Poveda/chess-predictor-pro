import { withAuth } from '@/core/shared/auth/withAuth';
import { ok } from '@/core/shared/http/responses';
import { getAiLevels } from '@/modules/arena/presentation/controllers/container';

export const GET = withAuth(async (_req, s) =>
  ok(await getAiLevels.execute(s.userId), { headers: { 'Cache-Control': 'no-store' } }));
