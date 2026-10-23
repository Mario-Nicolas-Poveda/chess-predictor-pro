import { withAuth } from '@/core/shared/auth/withAuth';
import { afterResponse } from '@/core/shared/http/background';
import { readJson } from '@/core/shared/http/readJson';
import { created } from '@/core/shared/http/responses';
import { CreateAiGameSchema } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import { createAiGame, playAiTurn } from '@/modules/arena/presentation/controllers/container';

export const POST = withAuth(async (req, s) => {
  const state = await createAiGame.execute(s.userId, await readJson(req, CreateAiGameSchema));   // 415 · 400 · 409 · 429
  // la IA con blancas abre después de responder
  if (state.turn !== state.yourColor) afterResponse('ai-first-move', () => playAiTurn.run(state.id));
  return created({ state }, `/api/v1/matches/${state.id}`);
});
