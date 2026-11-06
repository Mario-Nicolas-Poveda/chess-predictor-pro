import { toApiError } from '@/lib/apiClient';
import type { Polled } from '@/lib/etagPoller';
import type { RankingPage } from '@/modules/ranking/infrastructure/dto/rankingSchemas';

export interface RankingParams { sort: 'elo' | 'wins'; q?: string; limit: number; offset: number }

const qs = (p: RankingParams) =>
  new URLSearchParams({ sort: p.sort, limit: String(p.limit), offset: String(p.offset), ...(p.q?.trim() ? { q: p.q.trim() } : {}) });

/** GET /ranking · 200 + ETag · 304 · 400 (fields.sort / q / limit / offset). */
async function getRankingHttp(p: RankingParams, etag: string | null, signal?: AbortSignal): Promise<Polled<RankingPage>> {
  const res = await fetch(`/api/v1/ranking?${qs(p)}`, { cache: 'no-store', credentials: 'same-origin', signal, headers: etag ? { 'If-None-Match': etag } : undefined });
  if (res.status === 304) return { kind: 'not-modified' };
  if (!res.ok) throw await toApiError(res);
  return { kind: 'data', data: (await res.json()).ranking as RankingPage, etag: res.headers.get('ETag') };
}

// import diferido: en producción no se descargan los mocks
const getRankingMock: typeof getRankingHttp = async (p, etag, signal) => (await import('./rankingMock')).rankingMock(p, etag, signal);

export const getRanking = process.env.NEXT_PUBLIC_API_MOCK === '1' ? getRankingMock : getRankingHttp;
