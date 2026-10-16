import { ConflictError, NotFoundError } from '@/core/shared/errors/AppError';
import type { MatchmakingRepository } from '../domain/MatchmakingRepository';
import type { PlayerDirectory } from '../domain/PlayerDirectory';
import type { TimeControl } from '../infrastructure/dto/matchmakingSchemas';
import { searching } from './GetMatchmakingStatus';

export const alreadyInQueue = () => new ConflictError('ALREADY_IN_QUEUE', 'Ya estás buscando partida');

export class JoinQueue {
  constructor(private repo: MatchmakingRepository, private players: PlayerDirectory) {}

  async execute(userId: string, timeControl: TimeControl) {
    await this.repo.cleanup();   // una búsqueda abandonada (> 60 s) no debe dar 409 al volver
    const open = await this.repo.findOpenMatchFor(userId);
    if (open) throw new ConflictError('ACTIVE_MATCH_EXISTS', 'Ya tienes una partida en curso', undefined, { matchId: open.id });
    if (await this.repo.findEntry(userId)) throw alreadyInQueue();
    const [me] = await this.players.getMany([userId]);
    if (!me) throw new NotFoundError('NOT_FOUND', 'Usuario no encontrado');
    const entry = await this.repo.enqueue({ userId, elo: me.elo, timeControl, isBot: false });
    return searching(entry, (await this.repo.countSearching())[timeControl]);
  }
}
