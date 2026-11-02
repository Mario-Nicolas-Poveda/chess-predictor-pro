import { apiFetch, toApiError } from '@/lib/apiClient';
import type { CoachSummaryDTO, GameReviewDTO } from '@/modules/coach/infrastructure/dto/coachSchemas';

export type Polled<T> = { kind: 'data'; data: T; etag: string | null } | { kind: 'not-modified' };

async function getWithEtag<T>(url: string, key: string, etag: string | null, signal?: AbortSignal): Promise<Polled<T>> {
  const res = await fetch(url, {
    cache: 'no-store', credentials: 'same-origin', signal, headers: etag ? { 'If-None-Match': etag } : undefined,
  });
  if (res.status === 304) return { kind: 'not-modified' };
  if (!res.ok) throw await toApiError(res);
  return { kind: 'data', data: (await res.json())[key] as T, etag: res.headers.get('ETag') };
}

/** POST sin cuerpo: 200 (ya estaba listo) o 202 (en cola). */
async function postJob<T>(url: string, key: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { method: 'POST', cache: 'no-store', credentials: 'same-origin', signal });
  if (!res.ok) throw await toApiError(res);
  return (await res.json())[key] as T;
}

export const coachHttp = {
  review: (matchId: string, etag: string | null, signal?: AbortSignal) =>
    getWithEtag<GameReviewDTO>(`/api/v1/matches/${matchId}/review`, 'review', etag, signal),          // 200 · 304 · 404
  requestReview: (matchId: string, signal?: AbortSignal) =>
    postJob<GameReviewDTO>(`/api/v1/matches/${matchId}/review`, 'review', signal),                   // 200 · 202 · 409 · 422 · 429
  deleteReview: (matchId: string) =>
    apiFetch<void>(`/matches/${matchId}/review`, { method: 'DELETE' }),                              // 204 · 404 · 409
  summary: (etag: string | null, signal?: AbortSignal) =>
    getWithEtag<CoachSummaryDTO>('/api/v1/coach/summary', 'summary', etag, signal),                   // 200 · 304 · 404
  requestSummary: (signal?: AbortSignal) =>
    postJob<CoachSummaryDTO>('/api/v1/coach/summary', 'summary', signal),                            // 200 · 202 · 422 · 429
};

// import diferido: en producción no se descargan los fixtures de los mocks
const mock = () => import('./coachMock').then(m => m.coachMock);
const coachMocked: typeof coachHttp = {
  review: async (matchId, etag) => (await mock()).review(matchId, etag),
  requestReview: async matchId => (await mock()).requestReview(matchId),
  deleteReview: async matchId => (await mock()).deleteReview(matchId),
  summary: async etag => (await mock()).summary(etag),
  requestSummary: async () => (await mock()).requestSummary(),
};

/** Lo que usan los hooks: la API real o los mocks con los mismos códigos. */
export const coachApi = process.env.NEXT_PUBLIC_API_MOCK === '1' ? coachMocked : coachHttp;
