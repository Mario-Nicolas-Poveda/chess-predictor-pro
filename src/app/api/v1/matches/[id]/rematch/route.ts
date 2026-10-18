import { withAuth } from '@/core/shared/auth/withAuth';
import { parseParams } from '@/core/shared/http/params';
import { accepted, created, noContent } from '@/core/shared/http/responses';
import { rematch } from '@/modules/arena/presentation/controllers/container';
import { MatchParamsSchema } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';

// 202 = ofrecida (falta el rival) · 201 = aceptada, con la partida nueva en Location
export const POST = withAuth<{ id: string }>(async (_req, s, params) => {
  const { id } = parseParams(MatchParamsSchema, params);
  const r = await rematch.request(s.userId, id);
  return r.state === 'offered' ? accepted({ rematch: r }) : created({ rematch: r }, `/api/v1/matches/${r.matchId}`);
});

// retira la propia o rechaza la del rival
export const DELETE = withAuth<{ id: string }>(async (_req, s, params) => {
  const { id } = parseParams(MatchParamsSchema, params);
  await rematch.cancel(s.userId, id);
  return noContent();
});
