import { ownGame } from './guards';
import type { CoachGames } from './ports/CoachGames';
import type { CoachRepository } from './ports/CoachRepository';

/** DELETE /matches/:id/review → 204. 404 REVIEW_NOT_FOUND · 409 REVIEW_IN_PROGRESS. El análisis del motor se conserva. */
export class DeleteReview {
  constructor(private readonly repo: CoachRepository, private readonly games: CoachGames) {}
  async execute(userId: string, matchId: string): Promise<void> {
    await ownGame(this.games, matchId, userId);                              // 404 · 403
    await this.repo.deleteReview(matchId, userId);
  }
}
