import { z } from 'zod';
import { usernameSchema } from '@/modules/auth/infrastructure/dto/authSchemas';
import type { ProfilePreferences } from './preferencesSchemas';

export const UpdateProfileSchema = z.object({
  displayName: z.string().trim().max(40, 'Máximo 40').nullable().optional(),
  username: usernameSchema.optional(),
  country: z.string().length(2).toUpperCase().nullable().optional(),
  bio: z.string().trim().max(160, 'Máximo 160').nullable().optional(),
  avatarUrl: z.string().trim().regex(/^https:\/\/\S+$/, 'Debe ser una URL https').nullable().optional(),
}).strict();
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export type ProfileStats = { gamesPlayed: number; wins: number; losses: number; draws: number;
  winRate: number; currentStreak: number; bestElo: number };
export type Profile = {
  id: string; email: string; username: string; displayName: string | null; avatarUrl: string | null;
  country: string | null; bio: string | null; eloRating: number; authProvider: 'local' | 'google';
  createdAt: string; stats: ProfileStats; preferences: ProfilePreferences;
};
