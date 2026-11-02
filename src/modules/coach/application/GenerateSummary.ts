import { aggregate, SUMMARY_WINDOW } from '../domain/history';
import { buildPlanInput } from '../domain/planInput';
import { MIN_GAMES_FOR_PLAN } from '../infrastructure/dto/coachSchemas';
import { WRITE_BUDGET_MS, type JobResult } from './GenerateReview';
import type { CoachGames } from './ports/CoachGames';
import type { CoachRepository } from './ports/CoachRepository';
import type { CoachWriter } from './ports/CoachWriter';

export const SUMMARY_LEASE_MS = 60_000;

/** Junta las últimas partidas analizadas (solo números, ya guardados en facts) y escribe el plan. */
export class GenerateSummary {
  constructor(
    private readonly repo: CoachRepository,
    private readonly games: CoachGames,
    private readonly writer: CoachWriter,
    private readonly log: (msg: string, e: unknown) => void = (m, e) => console.error(m, e),
  ) {}

  async run(userId: string): Promise<JobResult> {
    if (!(await this.repo.claimSummary(userId, SUMMARY_LEASE_MS))) return 'busy';
    try {
      const info = await this.repo.readyInfo(userId);        // ANTES de leer: si entra otra mientras tanto, el plan saldrá "viejo"
      const rows = await this.repo.readyFacts(userId, SUMMARY_WINDOW);
      if (rows.length < MIN_GAMES_FOR_PLAN || !info.latest) throw new Error(`NOT_ENOUGH_GAMES:${rows.length}`);
      const { stats, plan } = aggregate(rows, await this.games.eloOf(userId));
      const written = await this.writer.plan(buildPlanInput(plan), AbortSignal.timeout(WRITE_BUDGET_MS));
      await this.repo.finishSummary(userId, stats, written, rows.length, info.latest);
      return 'done';
    } catch (e) {
      this.log('[coach:summary]', e);
      await this.repo.failSummary(userId, e instanceof Error ? e.message : String(e)).catch(() => {});
      return 'failed';
    }
  }
}
