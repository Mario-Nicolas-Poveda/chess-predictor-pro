import { describe, expect, it } from 'vitest';
import { winRate, type User } from '../../domain/User';
import type { UserRepository } from '../../domain/UserRepository';
import { GetUserProfile } from '../GetUserProfile';
import { UpdateUserProfile } from '../UpdateUserProfile';

const user = (id: string, username: string): User => ({
  id, email: `${username}@test.dev`, username, displayName: null, avatarUrl: null, country: null, bio: null,
  eloRating: 1200, authProvider: 'local', createdAt: '2026-10-12T00:00:00Z',
  stats: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, currentStreak: 0, bestElo: 1200 },
});

// búsqueda de username sin distinguir mayúsculas, como el ilike del repositorio Supabase
function memoryRepo(...users: User[]): UserRepository {
  return {
    async findById(id) { return users.find(u => u.id === id) ?? null; },
    async isUsernameTaken(name, exceptId) {
      return users.some(u => u.id !== exceptId && u.username.toLowerCase() === name.toLowerCase());
    },
    async update(id, patch) {
      const u = users.find(x => x.id === id);
      if (u) Object.assign(u, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
    },
  };
}

describe('UpdateUserProfile', () => {
  it('rechaza un username que ya usa otro (409)', async () => {
    const repo = memoryRepo(user('1', 'ana'), user('2', 'demo'));
    await expect(new UpdateUserProfile(repo).execute('1', { username: 'DEMO' }))
      .rejects.toMatchObject({ code: 'USERNAME_TAKEN', status: 409 });
  });

  it('acepta su propio username (aunque cambie mayúsculas) y devuelve el perfil actualizado', async () => {
    const repo = memoryRepo(user('1', 'ana'));
    const p = await new UpdateUserProfile(repo).execute('1', { username: 'Ana', bio: 'Italiana siempre' });
    expect(p).toMatchObject({ username: 'Ana', bio: 'Italiana siempre' });
  });
});

describe('GetUserProfile', () => {
  it('usuario inexistente → NOT_FOUND 404 (no un 500)', async () => {
    await expect(new GetUserProfile(memoryRepo()).execute('x'))
      .rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });
});

describe('winRate', () => {
  it('es 0 con 0 partidas y redondea el porcentaje', () => {
    expect(winRate(user('1', 'ana').stats)).toBe(0);
    expect(winRate({ ...user('1', 'ana').stats, gamesPlayed: 3, wins: 2 })).toBe(67);
  });
});
