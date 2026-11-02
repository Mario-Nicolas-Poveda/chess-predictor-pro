import { withAuth } from '@/core/shared/auth/withAuth';
import { afterResponse } from '@/core/shared/http/background';
import { parseParams } from '@/core/shared/http/params';
import { accepted, noContent, ok } from '@/core/shared/http/responses';
import { deleteReview, generateReview, getReview, requestReview } from '@/modules/coach/presentation/controllers/container';
import { MatchParamsSchema } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';

// El trabajo corre después de responder: motor (~7 s) + escritor (≤ 35 s)
export const maxDuration = 90;

export const POST = withAuth<{ id: string }>(async (_req, s, params) => {
  const { id } = parseParams(MatchParamsSchema, params);
  const { review, needsWork } = await requestReview.execute(s.userId, id);
  if (needsWork) afterResponse('coach-review', () => generateReview.run(id, s.userId));
  return review.status === 'ready' ? ok({ review }) : accepted({ review }, `/api/v1/matches/${id}/review`);
});

// 304 sin cuerpo y con el mismo ETag, igual que /state
export const GET = withAuth<{ id: string }>(async (req, s, params) => {
  const { id } = parseParams(MatchParamsSchema, params);
  const r = await getReview.execute(s.userId, id, req.headers.get('if-none-match'));
  // red de seguridad: si sigue en cola sin dueño, lo relanza (coach_claim_review evita que lo hagan dos)
  if (r.needsWork) afterResponse('coach-review-safety', () => generateReview.run(id, s.userId));
  const headers = { ETag: r.etag, 'Cache-Control': 'private, no-cache' };
  if (r.notModified) return new Response(null, { status: 304, headers });
  return ok({ review: r.review }, { headers });
});

export const DELETE = withAuth<{ id: string }>(async (_req, s, params) => {
  const { id } = parseParams(MatchParamsSchema, params);
  await deleteReview.execute(s.userId, id);
  return noContent();
});
