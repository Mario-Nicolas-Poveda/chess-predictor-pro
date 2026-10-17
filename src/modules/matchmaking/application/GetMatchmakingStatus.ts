import { eloWindow } from '../domain/eloWindow';
import type { MatchRecord } from '../domain/Match';
import type { MatchmakingRepository } from '../domain/MatchmakingRepository';
import type { PlayerDirectory } from '../domain/PlayerDirectory';
import type { QueueEntry } from '../domain/QueueEntry';
import type { MatchmakingStatus } from '../infrastructure/dto/matchmakingSchemas';
import { toSummary } from './GetMatch';

export function searching(entry: QueueEntry, searchingNow: number): MatchmakingStatus {
  // max 0: el reloj del servidor puede ir unos ms detrás del de la BD
  const waitedSeconds = Math.max(0, Math.floor((Date.now() - entry.joinedAt.getTime()) / 1000));
  const w = eloWindow(waitedSeconds);
  return { state: 'searching', timeControl: entry.timeControl, joinedAt: entry.joinedAt.toISOString(), waitedSeconds,
    elo: entry.elo, eloRange: { min: entry.elo - w, max: entry.elo + w }, searchingNow, pollAfterMs: 2000 };
}

export class GetMatchmakingStatus {
  constructor(private repo: MatchmakingRepository, private players: PlayerDirectory) {}

  async execute(userId: string): Promise<MatchmakingStatus> {
    await this.repo.cleanup();
    const open = await this.repo.findOpenMatchFor(userId);
    if (open) return this.matched(open, userId);
    const entry = await this.repo.findEntry(userId);
    if (!entry) return { state: 'idle' };
    const matchId = await this.repo.tryPair(userId);
    const match = matchId ? await this.repo.findMatch(matchId) : null;
    if (match) return this.matched(match, userId);
    return searching(entry, (await this.repo.countSearching())[entry.timeControl]);
  }

  private async matched(m: MatchRecord, userId: string): Promise<MatchmakingStatus> {
    return { state: 'matched', match: await toSummary(m, userId, this.players) };
  }
}
