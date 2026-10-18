import { withAuth } from '@/core/shared/auth/withAuth';
import { parseParams } from '@/core/shared/http/params';
import { ok } from '@/core/shared/http/responses';
import { MoveParamsSchema } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { getMove } from '@/modules/arena/presentation/controllers/container';

// a donde apunta el Location de POST /moves
export const GET = withAuth<{ id: string; ply: string }>(async (_req, s, params) => {
  const { id, ply } = parseParams(MoveParamsSchema, params);
  return ok({ move: await getMove.execute(s.userId, id, ply) });
});
