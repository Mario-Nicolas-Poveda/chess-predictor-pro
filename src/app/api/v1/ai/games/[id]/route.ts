import { withAuth } from '@/core/shared/auth/withAuth';
import { parseParams } from '@/core/shared/http/params';
import { noContent } from '@/core/shared/http/responses';
import { abortAiGame } from '@/modules/arena/presentation/controllers/container';
import { MatchParamsSchema } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';

// salir sin registrar contra la IA mientras no hayas jugado: 204 · 400 · 403 · 404 · 409
export const DELETE = withAuth<{ id: string }>(async (_req, s, params) => {
  const { id } = parseParams(MatchParamsSchema, params);
  await abortAiGame.execute(s.userId, id);
  return noContent();
});
