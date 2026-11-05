import { withAuth } from '@/core/shared/auth/withAuth';
import { NotFoundError } from '@/core/shared/errors/AppError';
import { readJson } from '@/core/shared/http/readJson';
import { created } from '@/core/shared/http/responses';
import { CreateTournamentSchema } from '@/modules/tournaments/infrastructure/dto/tournamentSchemas';
import { createTournament } from '@/modules/tournaments/presentation/controllers/container';

// Solo en desarrollo: sin ENABLE_DEV_ROUTES=true responde igual que una ruta que no existe
export const POST = withAuth(async (req, s) => {
  if (process.env.ENABLE_DEV_ROUTES !== 'true') throw new NotFoundError('ROUTE_NOT_FOUND', 'Esta ruta de la API no existe');
  const tournament = await createTournament.execute(s.userId, await readJson(req, CreateTournamentSchema));   // 415 · 400
  return created({ tournament }, `/api/v1/tournaments/${tournament.id}`);
});
