import { NotFoundError } from '@/core/shared/errors/AppError';
import { AI_LEVELS, recommendedLevel, type AiLevelsResponse } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import type { PlayerDirectory } from '@/modules/matchmaking/domain/PlayerDirectory';
import type { AiPlayers } from '../domain/AiPlayers';
import type { ArenaRepository } from '../domain/ArenaRepository';

export class GetAiLevels {
  constructor(private repo: ArenaRepository, private players: PlayerDirectory, private ai: AiPlayers) {}

  // el nivel recomendado sale de tu ELO; activeGame = la partida contra la IA que sigue abierta tras aplicar el tiempo
  async execute(userId: string): Promise<AiLevelsResponse> {
    const [me] = await this.players.getMany([userId]);
    if (!me) throw new NotFoundError('USER_NOT_FOUND', 'El usuario no existe');
    let open = await this.repo.openAiGame(userId);
    if (open) { await this.repo.settle(open.id); open = await this.repo.findMatch(open.id); }
    const live = open && (open.status === 'pending' || open.status === 'active') ? open : null;
    const level = live && (await this.ai.levelOf(live.whiteId === userId ? live.blackId : live.whiteId));
    return { levels: [...AI_LEVELS], recommended: recommendedLevel(me.elo),
      activeGame: live && level ? { matchId: live.id, level } : null };
  }
}
