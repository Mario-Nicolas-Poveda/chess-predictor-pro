import { withAuth } from '@/core/shared/auth/withAuth';
import { NotFoundError } from '@/core/shared/errors/AppError';
import { readJson } from '@/core/shared/http/readJson';
import { created, noContent } from '@/core/shared/http/responses';
import { AddBotSchema } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { addBotToQueue, removeBots } from '@/modules/matchmaking/presentation/controllers/container';

// Solo en desarrollo: sin ENABLE_DEV_ROUTES=true responde igual que una ruta que no existe
function assertDevRoutes() {
  if (process.env.ENABLE_DEV_ROUTES !== 'true') throw new NotFoundError('ROUTE_NOT_FOUND', 'Esta ruta de la API no existe');
}

export const POST = withAuth(async (req, s) => {
  assertDevRoutes();
  const bot = await addBotToQueue.execute(s.userId, await readJson(req, AddBotSchema));
  return created({ bot }, '/api/v1/matchmaking/stats');
});

export const DELETE = withAuth(async () => {
  assertDevRoutes();
  await removeBots.execute();
  return noContent();
});
