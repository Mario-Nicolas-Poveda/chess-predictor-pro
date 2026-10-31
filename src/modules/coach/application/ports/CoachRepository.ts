import type { MatchAnalysis, SummaryStats } from '../../domain/types';
import type { FactsRow, ReviewFacts } from '../../domain/history';
import type { CoachAdvice, CoachPlan, CoachSource, ReviewBadge, ReviewStatus } from '../../infrastructure/dto/coachSchemas';
import type { Written } from './CoachWriter';

export interface ReviewRecord {
  matchId: string; userId: string; status: ReviewStatus; version: number;
  facts: ReviewFacts | null; coach: CoachAdvice | null; source: CoachSource | null; model: string | null;
  error: string | null; attempts: number; leaseUntil: Date | null; updatedAt: Date;
}

export interface SummaryRecord {
  userId: string; status: ReviewStatus; version: number;
  stats: SummaryStats | null; plan: CoachPlan | null; source: CoachSource | null; model: string | null;
  basedOn: number | null; basedOnUntil: Date | null;
  error: string | null; attempts: number; leaseUntil: Date | null; updatedAt: Date;
}

/** Cuántas partidas analizadas tiene el usuario y cuándo terminó la última (para saber si el plan quedó viejo). */
export interface ReadyInfo { count: number; latest: Date | null }

/** Todo lo del coach en la BD. Las reglas que deben ser atómicas viven en funciones SQL (migración 0007). */
export interface CoachRepository {
  findReview(matchId: string, userId: string): Promise<ReviewRecord | null>;
  /** RPC coach_request_review: idempotente; si estaba 'failed', vuelve a la cola. */
  requestReview(matchId: string, userId: string): Promise<ReviewRecord>;
  /** RPC coach_claim_review: true = este proceso hace el trabajo. */
  claimReview(matchId: string, userId: string, leaseMs: number): Promise<boolean>;
  finishReview(matchId: string, userId: string, facts: ReviewFacts, coach: Written<CoachAdvice>, promptVersion: number): Promise<void>;
  failReview(matchId: string, userId: string, error: string): Promise<void>;
  /** 404 REVIEW_NOT_FOUND · 409 REVIEW_IN_PROGRESS. */
  deleteReview(matchId: string, userId: string): Promise<void>;
  badges(userId: string, matchIds: string[]): Promise<Map<string, ReviewBadge>>;

  /** Análisis del motor: es el mismo para los dos jugadores. */
  findAnalysis(matchId: string): Promise<MatchAnalysis | null>;
  saveAnalysis(matchId: string, a: MatchAnalysis): Promise<void>;

  /** Partidas analizadas, de la jugada más recientemente a la más vieja. `before` = solo las terminadas antes. */
  readyFacts(userId: string, limit: number, before?: string): Promise<FactsRow[]>;
  readyInfo(userId: string): Promise<ReadyInfo>;

  findSummary(userId: string): Promise<SummaryRecord | null>;
  /** RPC coach_request_summary: 422 NOT_ENOUGH_GAMES; si el plan está al día o en curso, lo devuelve tal cual. */
  requestSummary(userId: string, minGames: number): Promise<SummaryRecord>;
  claimSummary(userId: string, leaseMs: number): Promise<boolean>;
  finishSummary(userId: string, stats: SummaryStats, plan: Written<CoachPlan>, basedOn: number, basedOnUntil: Date): Promise<void>;
  failSummary(userId: string, error: string): Promise<void>;
}
