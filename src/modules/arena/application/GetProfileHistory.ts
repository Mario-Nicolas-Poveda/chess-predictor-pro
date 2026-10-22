import type { PlayerDirectory } from '@/modules/matchmaking/domain/PlayerDirectory';
import type { ArenaRepository } from '../domain/ArenaRepository';
import type { ProfileHistory } from '../infrastructure/dto/arenaSchemas';
import { withOpponents } from './GetMatchHistory';

const LAST_RESULTS = 34;   // la tira de resultados del perfil

export class GetProfileHistory {
  constructor(private repo: ArenaRepository, private players: PlayerDirectory) {}

  async execute(userId: string, days: number): Promise<ProfileHistory> {
    const [elo, rows] = await Promise.all([
      this.repo.eloSeries(userId, days),
      this.repo.history(userId, null, null, LAST_RESULTS, true),   // el perfil solo cuenta las que dan ELO
    ]);
    const items = await withOpponents(this.players, rows);
    return { elo, results: items.map(i => ({ id: i.id, outcome: i.outcome, opponent: i.opponent.username, endedAt: i.endedAt })) };
  }
}
