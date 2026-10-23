import type { PlayerDirectory } from '@/modules/matchmaking/domain/PlayerDirectory';
import type { AiPlayers } from '../domain/AiPlayers';
import type { ArenaRepository } from '../domain/ArenaRepository';
import { noDrawOffer } from '../domain/errors';
import { settleOwn, stateOf } from './GetGameState';

export class AnswerDraw {
  constructor(private repo: ArenaRepository, private players: PlayerDirectory, private ai: AiPlayers) {}

  // retira la propia o rechaza la del rival
  async decline(userId: string, id: string) {
    await settleOwn(this.repo, userId, id);
    if (!(await this.repo.clearDrawOffer(id))) throw noDrawOffer();
  }

  async accept(userId: string, id: string) {
    const { color } = await settleOwn(this.repo, userId, id);
    await this.repo.acceptDraw(id, color);   // arena_accept_draw decide con la fila bloqueada
    return stateOf(this.repo, this.players, this.ai, await this.repo.findMatch(id), color);
  }
}
