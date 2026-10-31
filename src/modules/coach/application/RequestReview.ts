import type { GameReviewDTO } from '../infrastructure/dto/coachSchemas';
import { leaseExpired, toGameReviewDTO } from './coachDto';
import { assertReviewable, ownGame } from './guards';
import type { CoachGames } from './ports/CoachGames';
import type { CoachRepository } from './ports/CoachRepository';

/**
 * POST /matches/:id/review. Idempotente: si ya existe (en cola o lista) la devuelve sin gastar el límite.
 * `needsWork` = la ruta debe lanzar GenerateReview después de responder.
 */
export class RequestReview {
  constructor(private readonly repo: CoachRepository, private readonly games: CoachGames,
              private readonly limit: (key: string) => Promise<void>,      // 429 solo por trabajo nuevo
              private readonly now: () => Date = () => new Date()) {}

  async execute(userId: string, matchId: string): Promise<{ review: GameReviewDTO; needsWork: boolean }> {
    const { game, you } = await ownGame(this.games, matchId, userId);        // 404 · 403
    assertReviewable(game);                                                  // 409 · 422 (antes del límite: no gastan cupo)
    const current = await this.repo.findReview(matchId, userId);
    if (current && current.status !== 'failed') {
      const a = current.status === 'ready' ? await this.repo.findAnalysis(matchId) : null;
      return { review: toGameReviewDTO(current, a, you), needsWork: leaseExpired(current, this.now()) };
    }
    await this.limit(`coach-review:${userId}`);
    const queued = await this.repo.requestReview(matchId, userId);           // vuelve a validar todo en SQL
    return { review: toGameReviewDTO(queued, null, you), needsWork: true };
  }
}
