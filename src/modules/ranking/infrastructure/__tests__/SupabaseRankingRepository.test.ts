import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/shared/db/supabaseAdmin', () => ({ supabaseAdmin: {} }));
const { toRankingRow } = await import('../SupabaseRankingRepository');

const raw = { rank: 1, id: 'u1', username: 'ana', display_name: null, avatar_url: null, elo: 1500, draws: 0, last5: [] };

describe('toRankingRow', () => {
  it('winRate redondeado y 0 sin partidas', () => {
    expect(toRankingRow({ ...raw, games: 0, wins: 0, losses: 0 }).winRate).toBe(0);
    expect(toRankingRow({ ...raw, games: 59, wins: 41, losses: 18 }).winRate).toBe(69);
    expect(toRankingRow({ ...raw, games: 0, wins: 0, losses: 0 }).player)
      .toEqual({ id: 'u1', username: 'ana', displayName: null, avatarUrl: null, elo: 1500 });
  });
});
