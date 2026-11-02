import type { ReviewBadge } from '../infrastructure/dto/coachSchemas';
import type { CoachRepository } from './ports/CoachRepository';

/** Para GET /matches: estado y precisión del análisis de cada partida de la página (una sola consulta). */
export class ReviewBadges {
  constructor(private readonly repo: CoachRepository) {}
  execute(userId: string, matchIds: string[]): Promise<Map<string, ReviewBadge>> {
    return matchIds.length ? this.repo.badges(userId, matchIds) : Promise.resolve(new Map());
  }
}
