import type { PlayerDirectory } from '@/modules/matchmaking/domain/PlayerDirectory';
import type { ArenaRepository, HistoryRow } from '../domain/ArenaRepository';
import type { HistoryQuery, MatchListItem } from '../infrastructure/dto/arenaSchemas';

// rivales de esas partidas, con el ELO que tenían en cada una
export async function withOpponents(players: PlayerDirectory, rows: HistoryRow[]): Promise<MatchListItem[]> {
  const list = await players.getMany([...new Set(rows.map(r => r.opponentId))]);
  return rows.flatMap(r => {
    const opp = list.find(p => p.id === r.opponentId);
    return opp ? [{ id: r.id, timeControl: r.timeControl, endedAt: r.endedAt.toISOString(), yourColor: r.yourColor,
      outcome: r.outcome, reason: r.reason, eloDelta: r.eloDelta, plies: r.plies, rated: r.rated, opponent: { ...opp, elo: r.opponentElo }, review: null }] : [];
  });
}

export class GetMatchHistory {
  constructor(private repo: ArenaRepository, private players: PlayerDirectory) {}

  async execute(userId: string, q: HistoryQuery) {
    // pide una de más: si llega, hay otra página y empieza antes de la última que se muestra
    const rows = await this.repo.history(userId, q.result ?? null, q.before ?? null, q.limit + 1);
    const shown = rows.slice(0, q.limit);
    const last = shown.at(-1);
    return { items: await withOpponents(this.players, shown),
      nextBefore: rows.length > q.limit && last ? last.endedAt.toISOString() : null };
  }
}
