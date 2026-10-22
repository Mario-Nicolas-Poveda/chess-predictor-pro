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

export interface AvatarResponse { avatarUrl: string }
export const AVATAR_MAX_BYTES = 1024 * 1024;                  // lo que acepta el servidor (la foto ya recortada a 512 × 512)
export const AVATAR_SOURCE_MAX_BYTES = 5 * 1024 * 1024;       // lo que acepta el navegador antes de recortar
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type ProfileStats = { gamesPlayed: number; wins: number; losses: number; draws: number;
  winRate: number; currentStreak: number; bestElo: number };
export type Profile = {
  id: string; email: string; username: string; displayName: string | null; avatarUrl: string | null;
  country: string | null; bio: string | null; eloRating: number; authProvider: 'local' | 'google';
  createdAt: string; stats: ProfileStats; preferences: ProfilePreferences;
};
