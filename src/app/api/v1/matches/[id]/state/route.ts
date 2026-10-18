import { withAuth } from '@/core/shared/auth/withAuth';
import { parseParams, parseQuery } from '@/core/shared/http/params';
import { ok } from '@/core/shared/http/responses';
import { StateQuerySchema } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { getGameState } from '@/modules/arena/presentation/controllers/container';
import { MatchParamsSchema } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';

// 304 sin cuerpo y con el mismo ETag: el cliente manda If-None-Match a mano y usa cache: 'no-store'
export const GET = withAuth<{ id: string }>(async (req, s, params) => {
  const { id } = parseParams(MatchParamsSchema, params);
  const { since } = parseQuery(StateQuerySchema, req);
  const r = await getGameState.execute(s.userId, id, since, req.headers.get('if-none-match'));
  const headers = { ETag: r.etag, 'Cache-Control': 'no-store' };
  if (r.notModified) return new Response(null, { status: 304, headers });
  return ok({ state: r.state }, { headers });
});
