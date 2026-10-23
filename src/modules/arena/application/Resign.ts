import type { PlayerDirectory } from '@/modules/matchmaking/domain/PlayerDirectory';
import type { AiPlayers } from '../domain/AiPlayers';
import type { ArenaRepository } from '../domain/ArenaRepository';
import { other } from '../domain/Match';
import { matchFinished, matchNotActive } from '../domain/errors';
import { settleOwn, stateOf } from './GetGameState';

export class Resign {
  constructor(private repo: ArenaRepository, private players: PlayerDirectory, private ai: AiPlayers) {}

  async execute(userId: string, id: string) {
    const { m, color } = await settleOwn(this.repo, userId, id);
    if (m.status === 'finished') throw matchFinished();
    if (m.status !== 'active') throw matchNotActive(m.status);
    await this.repo.finish(id, other(color), 'resign');   // arena_finish bloquea la fila: si terminó entre medio, no hace nada
    return stateOf(this.repo, this.players, this.ai, await this.repo.findMatch(id), color);
  }
}
