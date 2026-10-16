import type { ProfilePreferences } from '../infrastructure/dto/preferencesSchemas';

export interface UserStats { gamesPlayed: number; wins: number; losses: number; draws: number;
  currentStreak: number; bestElo: number; }
export interface User {
  id: string; email: string; username: string; displayName: string | null; avatarUrl: string | null;
  country: string | null; bio: string | null; eloRating: number;
  authProvider: 'local' | 'google'; createdAt: string; stats: UserStats; preferences: ProfilePreferences;
}
export const winRate = (s: UserStats) => s.gamesPlayed === 0 ? 0 : Math.round((s.wins / s.gamesPlayed) * 100);
