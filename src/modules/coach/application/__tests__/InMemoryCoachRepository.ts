import { ConflictError, ForbiddenError, NotFoundError, UnprocessableError } from '@/core/shared/errors/AppError';
import type { FactsRow, ReviewFacts } from '../../domain/history';
import type { MatchAnalysis, SummaryStats } from '../../domain/types';
import { MIN_PLIES_FOR_REVIEW, type CoachAdvice, type CoachPlan, type ReviewBadge } from '../../infrastructure/dto/coachSchemas';
import type { CoachGame } from '../ports/CoachGames';
import type { CoachRepository, ReviewRecord, SummaryRecord } from '../ports/CoachRepository';
import type { Written } from '../ports/CoachWriter';

/** Para los tests: las mismas reglas que las funciones SQL de 0007 (versión que sube en cada cambio incluida). */
export class InMemoryCoachRepository implements CoachRepository {
  reviews = new Map<string, ReviewRecord & { endedAt: string | null }>();
  summaries = new Map<string, SummaryRecord>();
  analyses = new Map<string, MatchAnalysis>();

  constructor(private readonly game: (id: string) => CoachGame | undefined, private readonly now: () => Date = () => new Date()) {}

  private key = (m: string, u: string) => `${m}|${u}`;
  private touch<T extends { version: number; updatedAt: Date }>(r: T, patch: Partial<T>): T {
    return Object.assign(r, patch, { version: r.version + 1, updatedAt: this.now() });
  }
  private copy = <T>(r: T): T => structuredClone(r);

  async findReview(m: string, u: string) { const r = this.reviews.get(this.key(m, u)); return r ? this.copy(r) : null; }
  async requestReview(m: string, u: string) {
    const g = this.game(m);
    if (!g) throw new NotFoundError('MATCH_NOT_FOUND', 'La partida no existe');
    if (u !== g.whiteId && u !== g.blackId) throw new ForbiddenError('FORBIDDEN', 'No jugaste esta partida');
    if (g.status !== 'finished') throw new ConflictError('MATCH_NOT_FINISHED', 'La partida todavía no termina');
    if (g.ply < MIN_PLIES_FOR_REVIEW) throw new UnprocessableError('GAME_TOO_SHORT', 'La partida es muy corta');
    const r = this.reviews.get(this.key(m, u));
    if (!r) {
      const fresh = { matchId: m, userId: u, status: 'pending' as const, version: 0, facts: null, coach: null, source: null, model: null,
        error: null, attempts: 0, leaseUntil: null, updatedAt: this.now(), endedAt: null };
      this.reviews.set(this.key(m, u), fresh);
      return this.copy(fresh);
    }
    if (r.status === 'failed') this.touch(r, { status: 'pending', error: null, attempts: 0, leaseUntil: null });
    return this.copy(r);
  }
  async claimReview(m: string, u: string, ms: number) {
    const r = this.reviews.get(this.key(m, u)), now = this.now();
    if (!r || r.status !== 'pending' || (r.leaseUntil && r.leaseUntil >= now)) return false;
    if (r.attempts >= 3) { this.touch(r, { status: 'failed', error: 'Se agotaron los intentos', leaseUntil: null }); return false; }
    this.touch(r, { attempts: r.attempts + 1, leaseUntil: new Date(now.getTime() + ms) });
    return true;
  }
  async finishReview(m: string, u: string, facts: ReviewFacts, w: Written<CoachAdvice>) {
    const r = this.reviews.get(this.key(m, u));
    if (r?.status === 'pending') this.touch(r, { status: 'ready', facts, coach: w.value, source: w.source, model: w.model, error: null, leaseUntil: null, endedAt: facts.endedAt });
  }
  async failReview(m: string, u: string, error: string) {
    const r = this.reviews.get(this.key(m, u));
    if (r?.status === 'pending') this.touch(r, { error: error.slice(0, 300), leaseUntil: null, status: r.attempts >= 3 ? 'failed' : 'pending' });
  }
  async deleteReview(m: string, u: string) {
    const r = this.reviews.get(this.key(m, u));
    if (!r) throw new NotFoundError('REVIEW_NOT_FOUND', 'Esta partida no tiene análisis todavía');
    if (r.status === 'pending') throw new ConflictError('REVIEW_IN_PROGRESS', 'El análisis se está haciendo');
    this.reviews.delete(this.key(m, u));
  }
  async badges(u: string, ids: string[]) {
    const out = new Map<string, ReviewBadge>();
    for (const id of ids) {
      const r = this.reviews.get(this.key(id, u));
      if (r) out.set(id, { status: r.status, accuracy: r.status === 'ready' ? r.facts?.accuracy ?? null : null });
    }
    return out;
  }
  async findAnalysis(m: string) { const a = this.analyses.get(m); return a ? this.copy(a) : null; }
  async saveAnalysis(m: string, a: MatchAnalysis) { this.analyses.set(m, this.copy(a)); }
  private ready(u: string) { return [...this.reviews.values()].filter(r => r.userId === u && r.status === 'ready'); }
  async readyFacts(u: string, limit: number, before?: string): Promise<FactsRow[]> {
    return this.ready(u).filter(r => !before || r.endedAt! < before)
      .sort((a, b) => b.endedAt!.localeCompare(a.endedAt!)).slice(0, limit)
      .map(r => ({ matchId: r.matchId, facts: this.copy(r.facts!) }));
  }
  async readyInfo(u: string) {
    const rs = this.ready(u);
    return { count: rs.length, latest: rs.length ? new Date(Math.max(...rs.map(r => r.updatedAt.getTime()))) : null };
  }
  async findSummary(u: string) { const s = this.summaries.get(u); return s ? this.copy(s) : null; }
  async requestSummary(u: string, min: number) {
    const info = await this.readyInfo(u);
    if (info.count < min) throw new UnprocessableError('NOT_ENOUGH_GAMES', 'Faltan partidas', { games: info.count, needed: min });
    const s = this.summaries.get(u);
    if (s && (s.status === 'pending' || (s.status === 'ready' && s.basedOnUntil! >= info.latest!))) return this.copy(s);
    if (!s) {
      const fresh: SummaryRecord = { userId: u, status: 'pending', version: 0, stats: null, plan: null, source: null, model: null,
        basedOn: null, basedOnUntil: null, error: null, attempts: 0, leaseUntil: null, updatedAt: this.now() };
      this.summaries.set(u, fresh);
      return this.copy(fresh);
    }
    this.touch(s, { status: 'pending', error: null, attempts: 0, leaseUntil: null });
    return this.copy(s);
  }
  async claimSummary(u: string, ms: number) {
    const s = this.summaries.get(u), now = this.now();
    if (!s || s.status !== 'pending' || (s.leaseUntil && s.leaseUntil >= now)) return false;
    if (s.attempts >= 3) { this.touch(s, { status: 'failed', error: 'Se agotaron los intentos', leaseUntil: null }); return false; }
    this.touch(s, { attempts: s.attempts + 1, leaseUntil: new Date(now.getTime() + ms) });
    return true;
  }
  async finishSummary(u: string, stats: SummaryStats, w: Written<CoachPlan>, basedOn: number, until: Date) {
    const s = this.summaries.get(u);
    if (s?.status === 'pending') this.touch(s, { status: 'ready', stats, plan: w.value, source: w.source, model: w.model, basedOn, basedOnUntil: until, error: null, leaseUntil: null });
  }
  async failSummary(u: string, error: string) {
    const s = this.summaries.get(u);
    if (s?.status === 'pending') this.touch(s, { error: error.slice(0, 300), leaseUntil: null, status: s.attempts >= 3 ? 'failed' : 'pending' });
  }
}
