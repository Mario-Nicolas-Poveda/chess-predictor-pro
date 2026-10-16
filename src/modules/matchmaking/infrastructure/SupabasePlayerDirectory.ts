import 'server-only';
import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';
import type { PlayerDirectory } from '../domain/PlayerDirectory';
import type { PlayerSummary } from './dto/matchmakingSchemas';

type Row = { id: string; username: string; display_name: string | null; avatar_url: string | null; elo_rating: number };

export class SupabasePlayerDirectory implements PlayerDirectory {
  getMany(ids: string[]) { return this.where('id', ids); }
  findByUsernames(usernames: readonly string[]) { return this.where('username', usernames); }

  private async where(column: 'id' | 'username', values: readonly string[]): Promise<PlayerSummary[]> {
    const { data, error } = await supabaseAdmin.from('users')
      .select('id, username, display_name, avatar_url, elo_rating').in(column, [...values]);
    if (error) throw error;
    return (data as Row[]).map(r => ({ id: r.id, username: r.username, displayName: r.display_name,
      avatarUrl: r.avatar_url, elo: r.elo_rating }));
  }
}
