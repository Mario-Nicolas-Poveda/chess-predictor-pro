import 'server-only';
import { escapeLike } from '@/core/shared/db/escapeLike';
import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';
import { usernameTaken } from '../application/UpdateUserProfile';
import type { User } from '../domain/User';
import type { UserRepository } from '../domain/UserRepository';
import { parsePreferences, type ProfilePreferences } from './dto/preferencesSchemas';
import type { UpdateProfileInput } from './dto/profileSchemas';

type StatsRow = { games_played: number; wins: number; losses: number; draws: number;
  current_streak: number; best_elo: number };
type Row = { id: string; email: string; username: string; display_name: string | null; avatar_url: string | null;
  country: string | null; bio: string | null; elo_rating: number; auth_provider: 'local' | 'google';
  created_at: string; user_stats: StatsRow | StatsRow[] | null; preferences: unknown };

const NO_STATS: StatsRow = { games_played: 0, wins: 0, losses: 0, draws: 0, current_streak: 0, best_elo: 1200 };

function map(r: Row): User {
  // user_stats llega como objeto (PK compartida); si llega array, tomar [0]
  const s = (Array.isArray(r.user_stats) ? r.user_stats[0] : r.user_stats) ?? NO_STATS;
  return {
    id: r.id, email: r.email, username: r.username, displayName: r.display_name, avatarUrl: r.avatar_url,
    country: r.country, bio: r.bio, eloRating: r.elo_rating, authProvider: r.auth_provider, createdAt: r.created_at,
    stats: { gamesPlayed: s.games_played, wins: s.wins, losses: s.losses, draws: s.draws,
      currentStreak: s.current_streak, bestElo: s.best_elo },
    preferences: parsePreferences(r.preferences),
  };
}

const COLUMNS = { displayName: 'display_name', username: 'username', country: 'country', bio: 'bio', avatarUrl: 'avatar_url' } as const;

export class SupabaseUserRepository implements UserRepository {
  async findById(id: string) {
    const { data, error } = await supabaseAdmin.from('users')
      .select('*, user_stats(*)').eq('id', id).maybeSingle<Row>();
    if (error) throw error;
    return data ? map(data) : null;
  }

  async isUsernameTaken(username: string, exceptId: string) {
    const { count, error } = await supabaseAdmin.from('users')
      .select('id', { head: true, count: 'exact' }).ilike('username', escapeLike(username)).neq('id', exceptId);
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async update(id: string, patch: UpdateProfileInput) {
    // undefined = no tocar; null = borrar el valor
    const row = Object.fromEntries(Object.entries(patch)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [COLUMNS[k as keyof typeof COLUMNS], v]));
    if (Object.keys(row).length === 0) return;
    if ('avatar_url' in row) row.avatar_path = null;   // una URL a mano ya no es la foto subida
    const { error } = await supabaseAdmin.from('users').update(row).eq('id', id);
    if (error?.code === '23505') throw usernameTaken();   // otro lo tomó entre la consulta y el update
    if (error) throw error;
  }

  async getAvatar(id: string) {
    const { data, error } = await supabaseAdmin.from('users').select('avatar_url, avatar_path').eq('id', id)
      .maybeSingle<{ avatar_url: string | null; avatar_path: string | null }>();
    if (error) throw error;
    return data && { url: data.avatar_url, path: data.avatar_path };
  }

  async setAvatar(id: string, url: string | null, path: string | null) {
    const { error } = await supabaseAdmin.from('users').update({ avatar_url: url, avatar_path: path }).eq('id', id);
    if (error) throw error;
  }

  async setPreferences(id: string, prefs: Partial<ProfilePreferences>) {
    const { data, error } = await supabaseAdmin.from('users').update({ preferences: prefs }).eq('id', id).select('id');
    if (error) throw error;
    return data.length > 0;
  }
}
