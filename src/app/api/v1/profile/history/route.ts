import { withAuth } from '@/core/shared/auth/withAuth';
import { parseQuery } from '@/core/shared/http/params';
import { ok } from '@/core/shared/http/responses';
import { ProfileHistoryQuerySchema } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { getProfileHistory } from '@/modules/arena/presentation/controllers/container';

export const GET = withAuth(async (req, s) =>
  ok(await getProfileHistory.execute(s.userId, parseQuery(ProfileHistoryQuerySchema, req).days)));
