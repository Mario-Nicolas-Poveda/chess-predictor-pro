import { withAuth } from '@/core/shared/auth/withAuth';
import { parseParams, parseQuery } from '@/core/shared/http/params';
import { noContent } from '@/core/shared/http/responses';
import { TakebackQuerySchema } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import { takeback } from '@/modules/arena/presentation/controllers/container';
import { MatchParamsSchema } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';

// ruta estática: gana a [ply]. Otro método aquí → 405
export const DELETE = withAuth<{ id: string }>(async (req, s, params) => {
  const { id } = parseParams(MatchParamsSchema, params);
  const { ply } = parseQuery(TakebackQuerySchema, req);   // 400 fields.ply
  await takeback.execute(s.userId, id, ply);
  return noContent();
});
