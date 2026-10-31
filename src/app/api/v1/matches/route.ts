import { withAuth } from '@/core/shared/auth/withAuth';
import { parseQuery } from '@/core/shared/http/params';
import { ok } from '@/core/shared/http/responses';
import { HistoryQuerySchema } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { getMatchHistory } from '@/modules/arena/presentation/controllers/container';
import { reviewBadges } from '@/modules/coach/presentation/controllers/container';

export const GET = withAuth(async (req, s) => {
  const page = await getMatchHistory.execute(s.userId, parseQuery(HistoryQuerySchema, req));
  const badges = await reviewBadges.execute(s.userId, page.items.map(i => i.id));
  return ok({ ...page, items: page.items.map(i => ({ ...i, review: badges.get(i.id) ?? null })) });
});
