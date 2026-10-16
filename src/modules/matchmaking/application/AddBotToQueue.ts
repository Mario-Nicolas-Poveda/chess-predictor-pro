import { NotFoundError } from '@/core/shared/errors/AppError';
import type { MatchmakingRepository } from '../domain/MatchmakingRepository';
import type { PlayerDirectory } from '../domain/PlayerDirectory';
import { BOT_USERNAMES, type AddBotInput } from '../infrastructure/dto/matchmakingSchemas';
import { alreadyInQueue } from './JoinQueue';

export class AddBotToQueue {
  constructor(private repo: MatchmakingRepository, private players: PlayerDirectory) {}

  async execute(userId: string, { timeControl, username }: AddBotInput) {
    const [me] = await this.players.getMany([userId]);
    if (!me) throw new NotFoundError('NOT_FOUND', 'Usuario no encontrado');
    // por defecto, el bot de ELO más cercano a quien lo pide
    const [bot] = (await this.players.findByUsernames(username ? [username] : BOT_USERNAMES))
      .sort((a, b) => Math.abs(a.elo - me.elo) - Math.abs(b.elo - me.elo));
    if (!bot) throw new NotFoundError('NOT_FOUND', 'Bot no encontrado: corre supabase/seed_bots.sql');
    await this.repo.cleanup();   // un bot de hace > 5 min ya no está en la cola
    if (await this.repo.findEntry(bot.id)) throw alreadyInQueue();
    await this.repo.enqueue({ userId: bot.id, elo: bot.elo, timeControl, isBot: true });
    return bot;
  }
}
