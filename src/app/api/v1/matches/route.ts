import { withAuth } from '@/core/shared/auth/withAuth';
import { parseQuery } from '@/core/shared/http/params';
import { ok } from '@/core/shared/http/responses';
import { HistoryQuerySchema } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { getMatchHistory } from '@/modules/arena/presentation/controllers/container';

export const GET = withAuth(async (req, s) =>
  ok(await getMatchHistory.execute(s.userId, parseQuery(HistoryQuerySchema, req))));
