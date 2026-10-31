import { withAuth } from '@/core/shared/auth/withAuth';
import { afterResponse } from '@/core/shared/http/background';
import { accepted, ok } from '@/core/shared/http/responses';
import { generateSummary, getSummary, requestSummary } from '@/modules/coach/presentation/controllers/container';

export const maxDuration = 90;

export const POST = withAuth(async (_req, s) => {
  const { summary, needsWork } = await requestSummary.execute(s.userId);
  if (needsWork) afterResponse('coach-summary', () => generateSummary.run(s.userId));
  return summary.status === 'pending' ? accepted({ summary }, '/api/v1/coach/summary') : ok({ summary });
});

export const GET = withAuth(async (req, s) => {
  const r = await getSummary.execute(s.userId, req.headers.get('if-none-match'));
  if (r.needsWork) afterResponse('coach-summary-safety', () => generateSummary.run(s.userId));
  const headers = { ETag: r.etag, 'Cache-Control': 'private, no-cache' };
  if (r.notModified) return new Response(null, { status: 304, headers });
  return ok({ summary: r.summary }, { headers });
});
