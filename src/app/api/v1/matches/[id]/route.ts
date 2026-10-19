import { withAuth } from '@/core/shared/auth/withAuth';
import { parseParams } from '@/core/shared/http/params';
import { noContent, ok } from '@/core/shared/http/responses';
import { MatchParamsSchema } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { abortMatch, getMatch } from '@/modules/matchmaking/presentation/controllers/container';

// parseParams → 400 con fields.id si el id no es uuid (antes de llegar a Postgres)
export const GET = withAuth<{ id: string }>(async (_req, s, params) =>
  ok({ match: await getMatch.execute(s.userId, parseParams(MatchParamsSchema, params).id) }));

export const DELETE = withAuth<{ id: string }>(async (_req, s, params) => {
  await abortMatch.execute(s.userId, parseParams(MatchParamsSchema, params).id);
  return noContent();
});
