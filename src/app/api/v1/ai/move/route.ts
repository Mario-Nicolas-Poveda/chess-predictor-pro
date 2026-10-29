import { withAuth } from '@/core/shared/auth/withAuth';
import { readJson } from '@/core/shared/http/readJson';
import { ok } from '@/core/shared/http/responses';
import { AiMoveSchema } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import { suggestMove } from '@/modules/arena/presentation/controllers/container';

export const POST = withAuth(async (req, s) => {
  const { fen, level } = await readJson(req, AiMoveSchema);
  return ok({ move: await suggestMove.execute(s.userId, fen, level) });   // 403 · 422 GAME_OVER · 429
});
