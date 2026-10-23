import type { CreateAiGameInput } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import type { PlayerDirectory } from '@/modules/matchmaking/domain/PlayerDirectory';
import type { AiPlayers } from '../domain/AiPlayers';
import type { ArenaRepository } from '../domain/ArenaRepository';
import type { Color } from '../infrastructure/dto/arenaSchemas';
import { stateOf } from './GetGameState';

export class CreateAiGame {
  constructor(private repo: ArenaRepository, private players: PlayerDirectory, private ai: AiPlayers,
              private limit: (key: string) => Promise<void>,   // 429 si empezó muchas seguidas
              private rng: () => number = Math.random) {}

  // ai_create_game: 409 AI_GAME_IN_PROGRESS con meta.matchId si ya tiene una sin terminar
  async execute(userId: string, input: CreateAiGameInput) {
    await this.limit(`ai-games:${userId}`);
    const color: Color = input.color === 'random' ? (this.rng() < 0.5 ? 'white' : 'black') : input.color;
    const id = await this.repo.createAiGame(userId, input.level, color, input.timeControl, input.prediction);
    return stateOf(this.repo, this.players, this.ai, await this.repo.findMatch(id), color);
  }
}
