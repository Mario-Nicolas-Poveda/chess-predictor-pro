import { withAuth } from '@/core/shared/auth/withAuth';
import { parseParams } from '@/core/shared/http/params';
import { created, noContent } from '@/core/shared/http/responses';
import { answerDraw, offerDraw } from '@/modules/arena/presentation/controllers/container';
import { MatchParamsSchema } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';

export const POST = withAuth<{ id: string }>(async (_req, s, params) => {
  const { id } = parseParams(MatchParamsSchema, params);
  return created({ state: await offerDraw.execute(s.userId, id) }, `/api/v1/matches/${id}/draw-offer`);
});

// retira la propia o rechaza la del rival
export const DELETE = withAuth<{ id: string }>(async (_req, s, params) => {
  const { id } = parseParams(MatchParamsSchema, params);
  await answerDraw.decline(s.userId, id);
  return noContent();
});
