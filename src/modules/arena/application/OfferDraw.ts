import { ConflictError } from '@/core/shared/errors/AppError';
import type { PlayerDirectory } from '@/modules/matchmaking/domain/PlayerDirectory';
import type { AiPlayers } from '../domain/AiPlayers';
import type { ArenaRepository } from '../domain/ArenaRepository';
import { matchNotActive } from '../domain/errors';
import { settleOwn, stateOf } from './GetGameState';

export class OfferDraw {
  constructor(private repo: ArenaRepository, private players: PlayerDirectory, private ai: AiPlayers) {}

  async execute(userId: string, id: string) {
    const { m, color } = await settleOwn(this.repo, userId, id);
    if (m.status !== 'active') throw matchNotActive(m.status);
    // update condicional (where draw_offer_by is null): dos ofertas a la vez no se pisan
    if (!(await this.repo.offerDraw(id, color))) throw new ConflictError('DRAW_ALREADY_OFFERED', 'Ya hay una oferta de tablas');
    return stateOf(this.repo, this.players, this.ai, await this.repo.findMatch(id), color);
  }
}
