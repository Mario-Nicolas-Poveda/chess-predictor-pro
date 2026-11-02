import { keyMoments } from '../domain/analyseMatch';
import type { Color, MatchAnalysis } from '../domain/types';
import { REVIEW_POLL_MS, type CoachSummaryDTO, type GameReviewDTO } from '../infrastructure/dto/coachSchemas';
import type { ReadyInfo, ReviewRecord, SummaryRecord } from './ports/CoachRepository';

/** El mensaje interno del fallo se queda en la BD; al usuario le llega uno fijo. */
export const REVIEW_FAILED_MESSAGE = 'No se pudo analizar la partida. Vuelve a pedirlo.';
export const SUMMARY_FAILED_MESSAGE = 'No se pudo preparar tu plan. Vuelve a pedirlo.';

export const reviewEtag = (r: ReviewRecord) => `"rv-${r.version}"`;

export function toGameReviewDTO(r: ReviewRecord, a: MatchAnalysis | null, you: Color): GameReviewDTO {
  const ready = r.status === 'ready' && !!a && !!r.coach && !!r.source;
  return {
    matchId: r.matchId,
    status: r.status,
    version: r.version,
    pollAfterMs: r.status === 'pending' ? REVIEW_POLL_MS : 0,
    yourColor: you,
    analysis: ready ? {
      opening: a!.opening,
      winWhite: a!.winWhite,
      moves: a!.moves.map(m => ({
        ply: m.ply, color: m.color, uci: m.uci, san: m.san, class: m.class,
        winLoss: m.winLoss, winWhiteAfter: m.winWhiteAfter, best: m.best, motif: m.motif,
      })),
      white: { accuracy: a!.white.accuracy, counts: a!.white.counts },
      black: { accuracy: a!.black.accuracy, counts: a!.black.counts },
      keyMoments: keyMoments(a!, you).map(m => m.ply),
    } : null,
    coach: ready ? { ...r.coach!, source: r.source!, model: r.model } : null,
    error: r.status === 'failed' ? REVIEW_FAILED_MESSAGE : null,
    updatedAt: r.updatedAt.toISOString(),
  };
}

export const isStale = (s: SummaryRecord, info: ReadyInfo) =>
  s.status === 'ready' && !!s.basedOnUntil && !!info.latest && info.latest > s.basedOnUntil;

export const summaryEtag = (s: SummaryRecord, info: ReadyInfo) => `"cs-${s.version}-${isStale(s, info) ? 1 : 0}"`;

export function toCoachSummaryDTO(s: SummaryRecord, info: ReadyInfo): CoachSummaryDTO {
  return {
    status: s.status,
    version: s.version,
    pollAfterMs: s.status === 'pending' ? REVIEW_POLL_MS : 0,
    stale: isStale(s, info),
    basedOn: s.basedOn ?? 0,
    stats: s.stats,
    plan: s.plan && s.source ? { ...s.plan, source: s.source, model: s.model } : null,
    error: s.status === 'failed' ? SUMMARY_FAILED_MESSAGE : null,
    updatedAt: s.updatedAt.toISOString(),
  };
}

/** Trabajo en cola sin dueño (o con el permiso vencido): la consulta lo relanza. */
export const leaseExpired = (r: { status: string; leaseUntil: Date | null }, now: Date) =>
  r.status === 'pending' && (!r.leaseUntil || r.leaseUntil < now);
