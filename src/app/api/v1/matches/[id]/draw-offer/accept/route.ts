import { withAuth } from '@/core/shared/auth/withAuth';
import { parseParams } from '@/core/shared/http/params';
import { ok } from '@/core/shared/http/responses';
import { answerDraw } from '@/modules/arena/presentation/controllers/container';
import { MatchParamsSchema } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';

export const POST = withAuth<{ id: string }>(async (_req, s, params) => {
  const { id } = parseParams(MatchParamsSchema, params);
  return ok({ state: await answerDraw.accept(s.userId, id) });
});
