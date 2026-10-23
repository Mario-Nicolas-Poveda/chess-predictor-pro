import { withAuth } from '@/core/shared/auth/withAuth';
import { parseParams } from '@/core/shared/http/params';
import { ok } from '@/core/shared/http/responses';
import { getPrediction } from '@/modules/arena/presentation/controllers/container';
import { MatchParamsSchema } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';

// 304 sin cuerpo y con el mismo ETag, igual que /state
export const GET = withAuth<{ id: string }>(async (req, s, params) => {
  const { id } = parseParams(MatchParamsSchema, params);
  const r = await getPrediction.execute(s.userId, id, req.headers.get('if-none-match'));
  const headers = { ETag: r.etag, 'Cache-Control': 'private, no-cache' };
  if (r.notModified) return new Response(null, { status: 304, headers });
  return ok({ prediction: r.prediction }, { headers });
});
