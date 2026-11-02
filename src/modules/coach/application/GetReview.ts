import { NotFoundError } from '@/core/shared/errors/AppError';
import type { GameReviewDTO } from '../infrastructure/dto/coachSchemas';
import { leaseExpired, reviewEtag, toGameReviewDTO } from './coachDto';
import { ownGame } from './guards';
import type { CoachGames } from './ports/CoachGames';
import type { CoachRepository } from './ports/CoachRepository';

export type GetReviewResult =
  | { notModified: true; etag: string; needsWork: boolean }
  | { notModified: false; etag: string; needsWork: boolean; review: GameReviewDTO };

/** GET /matches/:id/review con ETag. `needsWork` se calcula ANTES del 304 (red de seguridad del trabajo en cola). */
export class GetReview {
  constructor(private readonly repo: CoachRepository, private readonly games: CoachGames,
              private readonly now: () => Date = () => new Date()) {}

  async execute(userId: string, matchId: string, ifNoneMatch: string | null): Promise<GetReviewResult> {
    const { you } = await ownGame(this.games, matchId, userId);              // 404 · 403
    const r = await this.repo.findReview(matchId, userId);
    if (!r) throw new NotFoundError('REVIEW_NOT_FOUND', 'Esta partida no tiene análisis todavía');
    const etag = reviewEtag(r), needsWork = leaseExpired(r, this.now());
    if (ifNoneMatch === etag) return { notModified: true, etag, needsWork };
    const a = r.status === 'ready' ? await this.repo.findAnalysis(matchId) : null;
    return { notModified: false, etag, needsWork, review: toGameReviewDTO(r, a, you) };
  }
}
