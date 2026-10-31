import { ApiError } from '@/lib/apiClient';
import type { CoachSummaryDTO, GameReviewDTO } from '@/modules/coach/infrastructure/dto/coachSchemas';
import reviewFixture from './__fixtures__/review.pastor.json';
import summaryFixture from './__fixtures__/summary.json';
import type { Polled } from './coachApi';

/**
 * Mocks del coach (NEXT_PUBLIC_API_MOCK=1) con los mismos códigos que la API.
 * Escenario en localStorage 'cpp:mock-coach': ready (por defecto) · slow · failed · too-short · limited · offline · not-enough · stale
 * Los fixtures salen del análisis real (mate del pastor) — scripts/coach-fixture.ts los regenera.
 */
const scenario = () => { try { return localStorage.getItem('cpp:mock-coach') ?? 'ready'; } catch { return 'ready'; } };
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const REVIEW = reviewFixture.review as GameReviewDTO;
const SUMMARY = summaryFixture.summary as CoachSummaryDTO;

const reviews = new Map<string, { dto: GameReviewDTO; polls: number }>();
let summary: { dto: CoachSummaryDTO; polls: number } | null = null;

const readyReview = (matchId: string, version: number): GameReviewDTO => ({ ...REVIEW, matchId, version, updatedAt: new Date().toISOString() });
const pendingReview = (matchId: string, version: number): GameReviewDTO =>
  ({ ...REVIEW, matchId, version, status: 'pending', pollAfterMs: 1500, analysis: null, coach: null, updatedAt: new Date().toISOString() });

export const coachMock = {
  async review(matchId: string, etag: string | null): Promise<Polled<GameReviewDTO>> {
    await wait(200);
    if (scenario() === 'offline') throw new TypeError('Failed to fetch');
    const r = reviews.get(matchId);
    if (!r) throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Esta partida no tiene análisis todavía');
    if (r.dto.status === 'pending' && ++r.polls >= (scenario() === 'slow' ? 8 : 2)) {
      r.dto = scenario() === 'failed'
        ? { ...r.dto, status: 'failed', version: r.dto.version + 1, pollAfterMs: 0, error: 'No se pudo analizar la partida. Vuelve a pedirlo.' }
        : readyReview(matchId, r.dto.version + 1);
    }
    const tag = `"rv-${r.dto.version}"`;
    return etag === tag ? { kind: 'not-modified' } : { kind: 'data', data: r.dto, etag: tag };
  },
  async requestReview(matchId: string): Promise<GameReviewDTO> {
    await wait(250);
    const s = scenario();
    if (s === 'offline') throw new TypeError('Failed to fetch');
    if (s === 'too-short') throw new ApiError(422, 'GAME_TOO_SHORT', 'Hacen falta al menos 3 jugadas por lado para analizar', undefined, { minPlies: 6 });
    if (s === 'limited') throw new ApiError(429, 'RATE_LIMITED', 'Demasiadas solicitudes', undefined, { retryAfterS: 5400 });
    const r = reviews.get(matchId);
    if (r && r.dto.status !== 'failed') return r.dto;                       // idempotente (200 o 202)
    const dto = pendingReview(matchId, (r?.dto.version ?? 0) + 1);
    reviews.set(matchId, { dto, polls: 0 });
    return dto;                                                             // 202
  },
  async deleteReview(matchId: string): Promise<void> {
    await wait(150);
    const r = reviews.get(matchId);
    if (!r) throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Esta partida no tiene análisis todavía');
    if (r.dto.status === 'pending') throw new ApiError(409, 'REVIEW_IN_PROGRESS', 'El análisis se está haciendo; espera a que termine');
    reviews.delete(matchId);                                                // 204
  },
  async summary(etag: string | null): Promise<Polled<CoachSummaryDTO>> {
    await wait(200);
    const s = scenario();
    if (s === 'offline') throw new TypeError('Failed to fetch');
    if (!summary && s === 'stale') summary = { dto: { ...SUMMARY, stale: true }, polls: 0 };
    if (!summary) throw new ApiError(404, 'SUMMARY_NOT_FOUND', 'Todavía no tienes un plan');
    if (summary.dto.status === 'pending' && ++summary.polls >= 2)
      summary.dto = { ...SUMMARY, version: summary.dto.version + 1, basedOn: SUMMARY.basedOn + (summary.dto.stale ? 1 : 0), stale: false };
    const tag = `"cs-${summary.dto.version}-${summary.dto.stale ? 1 : 0}"`;
    return etag === tag ? { kind: 'not-modified' } : { kind: 'data', data: summary.dto, etag: tag };
  },
  async requestSummary(): Promise<CoachSummaryDTO> {
    await wait(250);
    const s = scenario();
    if (s === 'not-enough') throw new ApiError(422, 'NOT_ENOUGH_GAMES', 'Analiza al menos 3 partidas para tener tu plan (llevas 1)', undefined, { games: 1, needed: 3 });
    if (s === 'limited') throw new ApiError(429, 'RATE_LIMITED', 'Demasiadas solicitudes', undefined, { retryAfterS: 36_000 });
    if (summary && (summary.dto.status === 'pending' || !summary.dto.stale)) return summary.dto;
    const prev = summary?.dto;
    summary = { dto: { ...(prev ?? SUMMARY), status: 'pending', pollAfterMs: 1500, version: (prev?.version ?? 0) + 1, stats: prev?.stats ?? null, plan: prev?.plan ?? null }, polls: 0 };
    return summary.dto;                                                     // 202 (con el plan anterior si había)
  },
};
