import { withAuth } from '@/core/shared/auth/withAuth';
import { notModified } from '@/core/shared/http/etag';
import { parseQuery } from '@/core/shared/http/params';
import { ok } from '@/core/shared/http/responses';
import { RankingQuerySchema } from '@/modules/ranking/infrastructure/dto/rankingSchemas';
import { getRanking } from '@/modules/ranking/presentation/controllers/container';

export const GET = withAuth(async (req, s) => {
  const r = await getRanking.execute(s.userId, parseQuery(RankingQuerySchema, req), req.headers.get('if-none-match'));   // 400 fields.*
  const headers = { ETag: r.etag, 'Cache-Control': 'private, no-cache' };
  if (r.notModified) return notModified(headers);
  return ok({ ranking: r.ranking }, { headers });
});
