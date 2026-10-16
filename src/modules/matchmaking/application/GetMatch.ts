import { ForbiddenError, NotFoundError } from '@/core/shared/errors/AppError';
import { isPlayer, type MatchRecord } from '../domain/Match';
import type { MatchmakingRepository } from '../domain/MatchmakingRepository';
import type { PlayerDirectory } from '../domain/PlayerDirectory';
import type { MatchSummary } from '../infrastructure/dto/matchmakingSchemas';

const matchNotFound = () => new NotFoundError('MATCH_NOT_FOUND', 'La partida no existe');

// 404 si no existe, 403 si userId no la juega
export async function findOwnMatch(repo: MatchmakingRepository, userId: string, id: string) {
  const m = await repo.findMatch(id);
  if (!m) throw matchNotFound();
  if (!isPlayer(m, userId)) throw new ForbiddenError('No participas en esta partida');
  return m;
}

export async function toSummary(m: MatchRecord, userId: string, players: PlayerDirectory): Promise<MatchSummary> {
  const list = await players.getMany([m.whiteId, m.blackId]);
  const white = list.find(p => p.id === m.whiteId);
  const black = list.find(p => p.id === m.blackId);
  if (!white || !black) throw matchNotFound();   // borrar un jugador borra sus partidas (on delete cascade)
  const yourColor = m.whiteId === userId ? 'white' : 'black';
  return { id: m.id, timeControl: m.timeControl, status: m.status, createdAt: m.createdAt.toISOString(), yourColor,
    you: yourColor === 'white' ? white : black, opponent: yourColor === 'white' ? black : white };
}

export class GetMatch {
  constructor(private repo: MatchmakingRepository, private players: PlayerDirectory) {}
  async execute(userId: string, id: string) {
    return toSummary(await findOwnMatch(this.repo, userId, id), userId, this.players);
  }
}
