import { withAuth } from '@/core/shared/auth/withAuth';
import { afterResponse } from '@/core/shared/http/background';
import { clientIp } from '@/core/shared/http/clientIp';
import { LIMITS, rateLimit } from '@/core/shared/http/rateLimit';
import { readJson } from '@/core/shared/http/readJson';
import { created } from '@/core/shared/http/responses';
import { CreateAiGameSchema } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import { createAiGame, playAiTurn } from '@/modules/arena/presentation/controllers/container';

export const POST = withAuth(async (req, s) => {
  // por red: cada invitado nuevo trae su propio límite por usuario
  if (s.role === 'guest') await rateLimit(`ai-games-ip:${clientIp(req)}`, LIMITS.guestAiGames);   // 429
  const state = await createAiGame.execute(s.userId, await readJson(req, CreateAiGameSchema));   // 415 · 400 · 409 · 429
  // la IA con blancas abre después de responder
  if (state.turn !== state.yourColor) afterResponse('ai-first-move', () => playAiTurn.run(state.id));
  return created({ state }, `/api/v1/matches/${state.id}`);
}, { allow: 'any' });
