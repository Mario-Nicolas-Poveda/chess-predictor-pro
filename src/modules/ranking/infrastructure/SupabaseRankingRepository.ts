import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';
import type { RankingRepository } from '../application/ports/RankingRepository';
import type { GameOutcome, RankingPage, RankingQuery, RankingRow } from './dto/rankingSchemas';

export interface RawRankingRow {
  rank: number; id: string; username: string; display_name: string | null; avatar_url: string | null; elo: number;
  games: number; wins: number; draws: number; losses: number; last5: GameOutcome[];
}
interface RawPage { players: number; total: number; items: RawRankingRow[]; you: RawRankingRow | null; your_games: number }

export const toRankingRow = (r: RawRankingRow): RankingRow => ({
  rank: r.rank,
  player: { id: r.id, username: r.username, displayName: r.display_name, avatarUrl: r.avatar_url, elo: r.elo },
  games: r.games, wins: r.wins, draws: r.draws, losses: r.losses,
  winRate: r.games ? Math.round((r.wins * 100) / r.games) : 0,
  last5: r.last5,
});

export class SupabaseRankingRepository implements RankingRepository {
  async page(userId: string, q: RankingQuery, minGames: number): Promise<RankingPage> {
    const { data, error } = await supabaseAdmin.rpc('ranking_page', {
      p_user: userId, p_sort: q.sort, p_q: q.q ?? null, p_limit: q.limit, p_offset: q.offset, p_min: minGames,
    });
    if (error) throw error;
    const raw = data as RawPage;
    return {
      sort: q.sort, q: q.q ?? null, players: raw.players, total: raw.total, offset: q.offset, limit: q.limit,
      items: raw.items.map(toRankingRow),
      you: { row: raw.you ? toRankingRow(raw.you) : null, games: raw.your_games, needed: minGames },
    };
  }
}
