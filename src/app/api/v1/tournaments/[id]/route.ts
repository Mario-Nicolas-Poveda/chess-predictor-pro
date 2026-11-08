import { withAuth } from '@/core/shared/auth/withAuth';
import { notModified } from '@/core/shared/http/etag';
import { parseParams } from '@/core/shared/http/params';
import { ok } from '@/core/shared/http/responses';
import { TournamentParamsSchema } from '@/modules/tournaments/infrastructure/dto/tournamentSchemas';
import { getTournament } from '@/modules/tournaments/presentation/controllers/container';

export const GET = withAuth<{ id: string }>(async (req, s, params) => {
  const { id } = parseParams(TournamentParamsSchema, params);                              // 400
  const r = await getTournament.execute(s.userId, id, req.headers.get('if-none-match'));  // 404
  const headers = { ETag: r.etag, 'Cache-Control': 'private, no-cache' };
  if (r.notModified) return notModified(headers);
  return ok({ tournament: r.body, serverNow: new Date().toISOString() }, { headers });
}, { allow: 'any' });
