import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';
import { ConflictError, ForbiddenError, NotFoundError, UnprocessableError, type AppError } from '@/core/shared/errors/AppError';
import { matchNotFound } from '@/modules/arena/domain/errors';
import type { FactsRow, ReviewFacts } from '../domain/history';
import type { MatchAnalysis, SummaryStats } from '../domain/types';
import type { CoachRepository, ReadyInfo, ReviewRecord, SummaryRecord } from '../application/ports/CoachRepository';
import type { Written } from '../application/ports/CoachWriter';
import type { CoachAdvice, CoachPlan, CoachSource, ReviewBadge, ReviewStatus } from './dto/coachSchemas';

const RPC_ERRORS: Record<string, (arg?: string) => AppError> = {
  MATCH_NOT_FOUND:    matchNotFound,
  FORBIDDEN:          () => new ForbiddenError('FORBIDDEN', 'No jugaste esta partida'),
  MATCH_NOT_FINISHED: () => new ConflictError('MATCH_NOT_FINISHED', 'La partida todavía no termina'),
  GAME_TOO_SHORT:     () => new UnprocessableError('GAME_TOO_SHORT', 'La partida es muy corta para analizarla', { minPlies: 6 }),
  REVIEW_NOT_FOUND:   () => new NotFoundError('REVIEW_NOT_FOUND', 'Esta partida no tiene análisis todavía'),
  REVIEW_IN_PROGRESS: () => new ConflictError('REVIEW_IN_PROGRESS', 'El análisis se está haciendo; espera a que termine'),
  NOT_ENOUGH_GAMES:   n => new UnprocessableError('NOT_ENOUGH_GAMES', 'Analiza al menos 3 partidas para tener tu plan', { games: Number(n), needed: 3 }),
};
/** 'CODIGO' o 'CODIGO:valor' → error HTTP. Lo demás sigue como 500 (sin mostrar el mensaje). */
const fromRpc = (e: { message: string }) => {
  const [code = '', arg] = e.message.split(':');
  return RPC_ERRORS[code]?.(arg) ?? e;
};

interface ReviewRow {
  match_id: string; user_id: string; status: ReviewStatus; version: number;
  facts: ReviewFacts | null; coach: CoachAdvice | null; source: CoachSource | null; model: string | null;
  error: string | null; attempts: number; lease_until: string | null; updated_at: string;
}
interface SummaryRow {
  user_id: string; status: ReviewStatus; version: number;
  stats: SummaryStats | null; plan: CoachPlan | null; source: CoachSource | null; model: string | null;
  based_on: number | null; based_on_until: string | null;
  error: string | null; attempts: number; lease_until: string | null; updated_at: string;
}

const date = (v: string | null) => (v ? new Date(v) : null);
const toReview = (r: ReviewRow): ReviewRecord => ({
  matchId: r.match_id, userId: r.user_id, status: r.status, version: r.version,
  facts: r.facts, coach: r.coach, source: r.source, model: r.model, error: r.error,
  attempts: r.attempts, leaseUntil: date(r.lease_until), updatedAt: new Date(r.updated_at),
});
const toSummary = (r: SummaryRow): SummaryRecord => ({
  userId: r.user_id, status: r.status, version: r.version, stats: r.stats, plan: r.plan,
  source: r.source, model: r.model, basedOn: r.based_on, basedOnUntil: date(r.based_on_until),
  error: r.error, attempts: r.attempts, leaseUntil: date(r.lease_until), updatedAt: new Date(r.updated_at),
});

const REVIEW_COLS = 'match_id, user_id, status, version, facts, coach, source, model, error, attempts, lease_until, updated_at';
const SUMMARY_COLS = 'user_id, status, version, stats, plan, source, model, based_on, based_on_until, error, attempts, lease_until, updated_at';

export class SupabaseCoachRepository implements CoachRepository {
  async findReview(matchId: string, userId: string) {
    const { data, error } = await supabaseAdmin.from('game_reviews').select(REVIEW_COLS)
      .eq('match_id', matchId).eq('user_id', userId).maybeSingle<ReviewRow>();
    if (error) throw error;
    return data ? toReview(data) : null;
  }
  async requestReview(matchId: string, userId: string) {
    const { data, error } = await supabaseAdmin.rpc('coach_request_review', { p_match: matchId, p_user: userId });
    if (error) throw fromRpc(error);
    return toReview(data as ReviewRow);
  }
  async claimReview(matchId: string, userId: string, leaseMs: number) {
    const { data, error } = await supabaseAdmin.rpc('coach_claim_review', { p_match: matchId, p_user: userId, p_ms: leaseMs });
    if (error) throw error;
    return data === true;
  }
  async finishReview(matchId: string, userId: string, facts: ReviewFacts, w: Written<CoachAdvice>, promptVersion: number) {
    const { error } = await supabaseAdmin.rpc('coach_finish_review', {
      p_match: matchId, p_user: userId, p_facts: facts, p_coach: w.value,
      p_source: w.source, p_model: w.model, p_prompt_version: promptVersion,
    });
    if (error) throw error;
  }
  async failReview(matchId: string, userId: string, message: string) {
    const { error } = await supabaseAdmin.rpc('coach_fail_review', { p_match: matchId, p_user: userId, p_error: message });
    if (error) throw error;
  }
  async deleteReview(matchId: string, userId: string) {
    const { error } = await supabaseAdmin.rpc('coach_delete_review', { p_match: matchId, p_user: userId });
    if (error) throw fromRpc(error);
  }
  async badges(userId: string, matchIds: string[]) {
    const { data, error } = await supabaseAdmin.from('game_reviews').select('match_id, status, accuracy:facts->accuracy')
      .eq('user_id', userId).in('match_id', matchIds);
    if (error) throw error;
    return new Map<string, ReviewBadge>(((data ?? []) as unknown as { match_id: string; status: ReviewStatus; accuracy: unknown }[]).map(r =>
      [r.match_id, { status: r.status, accuracy: r.status === 'ready' && typeof r.accuracy === 'number' ? r.accuracy : null }]));
  }

  async findAnalysis(matchId: string) {
    const { data, error } = await supabaseAdmin.from('match_analyses').select('analysis').eq('match_id', matchId).maybeSingle<{ analysis: MatchAnalysis }>();
    if (error) throw error;
    return data?.analysis ?? null;
  }
  async saveAnalysis(matchId: string, a: MatchAnalysis) {
    const { error } = await supabaseAdmin.from('match_analyses')
      .upsert({ match_id: matchId, engine_version: a.version, analysis: a }, { onConflict: 'match_id' });
    if (error) throw error;
  }

  async readyFacts(userId: string, limit: number, before?: string): Promise<FactsRow[]> {
    let q = supabaseAdmin.from('game_reviews').select('match_id, facts')
      .eq('user_id', userId).eq('status', 'ready').order('ended_at', { ascending: false }).limit(limit);
    if (before) q = q.lt('ended_at', before);
    const { data, error } = await q;
    if (error) throw error;
    return ((data ?? []) as { match_id: string; facts: ReviewFacts }[]).map(r => ({ matchId: r.match_id, facts: r.facts }));
  }
  async readyInfo(userId: string): Promise<ReadyInfo> {
    // Una sola consulta: el total (count) y la última que terminó de analizarse
    const { data, count, error } = await supabaseAdmin.from('game_reviews').select('updated_at', { count: 'exact' })
      .eq('user_id', userId).eq('status', 'ready').order('updated_at', { ascending: false }).limit(1);
    if (error) throw error;
    return { count: count ?? 0, latest: data?.[0] ? new Date(data[0].updated_at) : null };
  }

  async findSummary(userId: string) {
    const { data, error } = await supabaseAdmin.from('coach_summaries').select(SUMMARY_COLS).eq('user_id', userId).maybeSingle<SummaryRow>();
    if (error) throw error;
    return data ? toSummary(data) : null;
  }
  async requestSummary(userId: string, minGames: number) {
    const { data, error } = await supabaseAdmin.rpc('coach_request_summary', { p_user: userId, p_min_games: minGames });
    if (error) throw fromRpc(error);
    return toSummary(data as SummaryRow);
  }
  async claimSummary(userId: string, leaseMs: number) {
    const { data, error } = await supabaseAdmin.rpc('coach_claim_summary', { p_user: userId, p_ms: leaseMs });
    if (error) throw error;
    return data === true;
  }
  async finishSummary(userId: string, stats: SummaryStats, w: Written<CoachPlan>, basedOn: number, until: Date) {
    const { error } = await supabaseAdmin.rpc('coach_finish_summary', {
      p_user: userId, p_stats: stats, p_plan: w.value, p_source: w.source, p_model: w.model,
      p_based_on: basedOn, p_based_on_until: until.toISOString(),
    });
    if (error) throw error;
  }
  async failSummary(userId: string, message: string) {
    const { error } = await supabaseAdmin.rpc('coach_fail_summary', { p_user: userId, p_error: message });
    if (error) throw error;
  }
}
