import { withAuth } from '@/core/shared/auth/withAuth';
import { parseParams } from '@/core/shared/http/params';
import { created, noContent, ok } from '@/core/shared/http/responses';
import { TournamentParamsSchema } from '@/modules/tournaments/infrastructure/dto/tournamentSchemas';
import { getRegistration, joinTournament, leaveTournament } from '@/modules/tournaments/presentation/controllers/container';

export const POST = withAuth<{ id: string }>(async (_req, s, params) => {
  const { id } = parseParams(TournamentParamsSchema, params);
  const r = await joinTournament.execute(s.userId, id);                                    // 403 · 404 · 409 · 429
  return r.created
    ? created({ tournament: r.tournament }, `/api/v1/tournaments/${id}/registration`)      // 201 + Location
    : ok({ tournament: r.tournament });                                                    // 200: ya estabas
});

export const GET = withAuth<{ id: string }>(async (_req, s, params) => {
  const { id } = parseParams(TournamentParamsSchema, params);
  return ok({ registration: await getRegistration.execute(s.userId, id) });               // 404 NOT_REGISTERED
});

export const DELETE = withAuth<{ id: string }>(async (_req, s, params) => {
  const { id } = parseParams(TournamentParamsSchema, params);
  await leaveTournament.execute(s.userId, id);                                             // 404 · 409
  return noContent();
});
