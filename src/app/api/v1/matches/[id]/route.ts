import { withAuth } from '@/core/shared/auth/withAuth';
import { noContent, ok } from '@/core/shared/http/responses';
import { MatchIdSchema } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { abortMatch, getMatch } from '@/modules/matchmaking/presentation/controllers/container';

// MatchIdSchema.parse → 400 si el id no es uuid (antes de llegar a Postgres)
export const GET = withAuth<{ id: string }>(async (_req, s, { id }) =>
  ok({ match: await getMatch.execute(s.userId, MatchIdSchema.parse(id)) }));

export const DELETE = withAuth<{ id: string }>(async (_req, s, { id }) => {
  await abortMatch.execute(s.userId, MatchIdSchema.parse(id));
  return noContent();
});
