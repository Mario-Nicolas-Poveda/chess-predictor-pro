import { ConflictError } from '@/core/shared/errors/AppError';
import type { MatchmakingRepository } from '../domain/MatchmakingRepository';
import { findOwnMatch } from './GetMatch';

export class AbortMatch {
  constructor(private repo: MatchmakingRepository) {}
  async execute(userId: string, id: string) {
    await findOwnMatch(this.repo, userId, id);
    // el estado no se mira aquí: entre leer y escribir la partida puede empezar, así que lo decide el UPDATE
    if (!(await this.repo.abortIfPending(id)))
      throw new ConflictError('MATCH_NOT_PENDING', 'La partida ya empezó o terminó. Si está en juego, ríndete.');
  }
}
