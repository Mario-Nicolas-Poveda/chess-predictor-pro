import { ConflictError } from '@/core/shared/errors/AppError';
import type { MatchmakingRepository } from '../domain/MatchmakingRepository';
import { findOwnMatch } from './GetMatch';

export class AbortMatch {
  constructor(private repo: MatchmakingRepository) {}
  async execute(userId: string, id: string) {
    const m = await findOwnMatch(this.repo, userId, id);
    if (m.status !== 'pending')
      throw new ConflictError('MATCH_NOT_PENDING', 'Solo se puede abandonar una partida que no ha empezado');
    // shortcut: el update no exige status = 'pending'; cuando el Sprint 3 pase partidas a 'active', hacerlo condicional
    await this.repo.setMatchStatus(id, 'aborted');
  }
}
