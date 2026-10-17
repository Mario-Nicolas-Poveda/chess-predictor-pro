import { DEFAULT_PREFERENCES } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';
import type { Profile } from '@/modules/dashboard/infrastructure/dto/profileSchemas';
import type { ProfileExtras } from '../components/ProfileContent';

// Datos de ejemplo para /dev/perfil (solo desarrollo): 31 días de 1200 a 1450 y 34 partidas, 23 ganadas y las 5 últimas seguidas.
const day = (i: number) => new Date(Date.UTC(2026, 9, 1 + i)).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const WAVE = [0, 14, -9, 6, 18, -4, 9, -12, 3, 15];
const PATTERN = 'WWWWWLWWLWWWWLLLWWWLWWWWLLLLLWWWW';   // 33 + la de hoy

export const demoProfile: Profile = {
  id: '00000000-0000-0000-0000-000000000000', email: 'alice@demo.dev', username: 'alice', displayName: 'Alicia Romero',
  avatarUrl: null, country: 'CO', bio: null, eloRating: 1450, authProvider: 'local', createdAt: '2026-03-04T12:00:00Z',
  stats: { gamesPlayed: 34, wins: 23, losses: 11, draws: 0, winRate: 68, currentStreak: 5, bestElo: 1450 },
  preferences: DEFAULT_PREFERENCES,
};

export const demoExtras: ProfileExtras = {
  history: Array.from({ length: 31 }, (_, i) => ({
    date: day(i),
    elo: i === 0 ? 1200 : i === 30 ? 1450 : Math.min(1449, Math.round(1200 + (250 * i) / 30 + WAVE[i % WAVE.length]!)),
  })),
  results: [...PATTERN + 'W'].map((c, i) => ({ id: `g${i}`, result: c === 'W' ? 'win' as const : 'loss' as const, opponent: `rival_${i + 1}`, date: day(i) })),
  achievements: ['Primera victoria', 'Racha de 5', 'Top 100'],
};
