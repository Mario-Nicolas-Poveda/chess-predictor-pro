import { NotFoundError } from '@/core/shared/errors/AppError';
import type { CoachSummaryDTO } from '../infrastructure/dto/coachSchemas';
import { leaseExpired, summaryEtag, toCoachSummaryDTO } from './coachDto';
import type { CoachRepository } from './ports/CoachRepository';

export type GetSummaryResult =
  | { notModified: true; etag: string; needsWork: boolean }
  | { notModified: false; etag: string; needsWork: boolean; summary: CoachSummaryDTO };

/** GET /coach/summary con ETag (cambia también cuando el plan queda viejo). 404 SUMMARY_NOT_FOUND. */
export class GetSummary {
  constructor(private readonly repo: CoachRepository, private readonly now: () => Date = () => new Date()) {}

  async execute(userId: string, ifNoneMatch: string | null): Promise<GetSummaryResult> {
    const [s, info] = await Promise.all([this.repo.findSummary(userId), this.repo.readyInfo(userId)]);
    if (!s) throw new NotFoundError('SUMMARY_NOT_FOUND', 'Todavía no tienes un plan');
    const etag = summaryEtag(s, info), needsWork = leaseExpired(s, this.now());
    if (ifNoneMatch === etag) return { notModified: true, etag, needsWork };
    return { notModified: false, etag, needsWork, summary: toCoachSummaryDTO(s, info) };
  }
}
