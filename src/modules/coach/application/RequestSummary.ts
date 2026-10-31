import { UnprocessableError } from '@/core/shared/errors/AppError';
import { MIN_GAMES_FOR_PLAN, type CoachSummaryDTO } from '../infrastructure/dto/coachSchemas';
import { isStale, leaseExpired, toCoachSummaryDTO } from './coachDto';
import type { CoachRepository } from './ports/CoachRepository';

/** POST /coach/summary. Si el plan está al día o se está haciendo, lo devuelve sin gastar el límite. */
export class RequestSummary {
  constructor(private readonly repo: CoachRepository,
              private readonly limit: (key: string) => Promise<void>,      // 429 solo por trabajo nuevo
              private readonly now: () => Date = () => new Date()) {}

  async execute(userId: string): Promise<{ summary: CoachSummaryDTO; needsWork: boolean }> {
    const info = await this.repo.readyInfo(userId);
    if (info.count < MIN_GAMES_FOR_PLAN)
      throw new UnprocessableError('NOT_ENOUGH_GAMES',
        `Analiza al menos ${MIN_GAMES_FOR_PLAN} partidas para tener tu plan (llevas ${info.count})`,
        { games: info.count, needed: MIN_GAMES_FOR_PLAN });
    const current = await this.repo.findSummary(userId);
    if (current && (current.status === 'pending' || (current.status === 'ready' && !isStale(current, info))))
      return { summary: toCoachSummaryDTO(current, info), needsWork: leaseExpired(current, this.now()) };
    await this.limit(`coach-summary:${userId}`);
    const queued = await this.repo.requestSummary(userId, MIN_GAMES_FOR_PLAN);
    return { summary: toCoachSummaryDTO(queued, info), needsWork: queued.status === 'pending' };
  }
}
