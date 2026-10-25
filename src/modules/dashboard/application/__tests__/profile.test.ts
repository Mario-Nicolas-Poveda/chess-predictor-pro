import { describe, expect, it } from 'vitest';
import { TooManyRequestsError } from '@/core/shared/errors/AppError';
import type { AvatarStorage } from '../../domain/AvatarStorage';
import { winRate, type User } from '../../domain/User';
import type { UserRepository } from '../../domain/UserRepository';
import { DEFAULT_PREFERENCES, parsePreferences } from '../../infrastructure/dto/preferencesSchemas';
import { GetUserProfile } from '../GetUserProfile';
import { RemoveAvatar } from '../RemoveAvatar';
import { ResetProfilePreferences } from '../ResetProfilePreferences';
import { SaveProfilePreferences } from '../SaveProfilePreferences';
import { SetAvatar } from '../SetAvatar';
import { UpdateUserProfile } from '../UpdateUserProfile';

const user = (id: string, username: string): User => ({
  id, email: `${username}@test.dev`, username, displayName: null, avatarUrl: null, country: null, bio: null,
  eloRating: 1200, authProvider: 'local', createdAt: '2026-10-12T00:00:00Z',
  stats: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, currentStreak: 0, bestElo: 1200 },
  preferences: DEFAULT_PREFERENCES,
});

// búsqueda de username sin distinguir mayúsculas, como el ilike del repositorio Supabase
function memoryRepo(...users: User[]): UserRepository & { paths: Record<string, string | null> } {
  const paths: Record<string, string | null> = {};   // avatar_path por usuario
  return {
    paths,
    async getAvatar(id) {
      const u = users.find(x => x.id === id);
      return u ? { url: u.avatarUrl, path: paths[id] ?? null } : null;
    },
    async setAvatar(id, url, path) {
      const u = users.find(x => x.id === id);
      if (u) { u.avatarUrl = url; paths[id] = path; }
    },
    async findById(id) { return users.find(u => u.id === id) ?? null; },
    async isUsernameTaken(name, exceptId) {
      return users.some(u => u.id !== exceptId && u.username.toLowerCase() === name.toLowerCase());
    },
    async update(id, patch) {
      const u = users.find(x => x.id === id);
      if (u) Object.assign(u, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
      if (patch.avatarUrl !== undefined) paths[id] = null;
    },
    async setPreferences(id, prefs) {
      const u = users.find(x => x.id === id);
      if (u) u.preferences = parsePreferences(prefs);   // como al leer la columna jsonb
      return !!u;
    },
  };
}

// Storage en memoria: guarda las rutas subidas
function memoryStorage(fail: { put?: boolean } = {}) {
  const files = new Set<string>();
  const storage: AvatarStorage = {
    async put(path) { if (fail.put) throw new Error('storage caído'); files.add(path); return `https://cdn.test/${path}`; },
    async remove(path) { files.delete(path); },
  };
  return { files, storage };
}
const noLimit = async () => {};
const webp = { bytes: new Uint8Array([1, 2, 3]), type: 'image/webp' as const };

describe('UpdateUserProfile', () => {
  it('rechaza un username que ya usa otro (409)', async () => {
    const repo = memoryRepo(user('1', 'ana'), user('2', 'demo'));
    await expect(new UpdateUserProfile(repo, memoryStorage().storage).execute('1', { username: 'DEMO' }))
      .rejects.toMatchObject({ code: 'USERNAME_TAKEN', status: 409 });
  });

  it('acepta su propio username (aunque cambie mayúsculas) y devuelve el perfil actualizado', async () => {
    const repo = memoryRepo(user('1', 'ana'));
    const p = await new UpdateUserProfile(repo, memoryStorage().storage).execute('1', { username: 'Ana', bio: 'Italiana siempre' });
    expect(p).toMatchObject({ username: 'Ana', bio: 'Italiana siempre' });
  });

  it('avatarUrl a mano borra el archivo de la foto subida', async () => {
    const repo = memoryRepo(user('1', 'ana')), { files, storage } = memoryStorage();
    await new SetAvatar(repo, storage, noLimit, () => 'f1').execute('1', webp);
    await new UpdateUserProfile(repo, storage).execute('1', { avatarUrl: 'https://otra.dev/yo.png' });
    expect(files.size).toBe(0);
    expect(await repo.getAvatar('1')).toEqual({ url: 'https://otra.dev/yo.png', path: null });
  });
});

describe('SetAvatar', () => {
  it('primera foto → created y se guarda la ruta; segunda → reemplaza y borra la vieja', async () => {
    const repo = memoryRepo(user('1', 'ana')), { files, storage } = memoryStorage();
    let n = 0;
    const set = new SetAvatar(repo, storage, noLimit, () => `f${++n}`);
    expect(await set.execute('1', webp)).toEqual({ url: 'https://cdn.test/1/f1.webp', created: true });
    expect(await set.execute('1', { ...webp, type: 'image/jpeg' })).toEqual({ url: 'https://cdn.test/1/f2.jpg', created: false });
    expect([...files]).toEqual(['1/f2.jpg']);
    expect(await repo.getAvatar('1')).toEqual({ url: 'https://cdn.test/1/f2.jpg', path: '1/f2.jpg' });
  });

  it('si falla guardar en users se borra la recién subida', async () => {
    const repo = memoryRepo(user('1', 'ana')), { files, storage } = memoryStorage();
    repo.setAvatar = async () => { throw new Error('bd caída'); };
    await expect(new SetAvatar(repo, storage, noLimit).execute('1', webp)).rejects.toThrow('bd caída');
    expect(files.size).toBe(0);
  });

  it('límite superado → 429 sin subir nada', async () => {
    const repo = memoryRepo(user('1', 'ana')), { files, storage } = memoryStorage();
    const limit = async () => { throw new TooManyRequestsError(120); };
    await expect(new SetAvatar(repo, storage, limit).execute('1', webp))
      .rejects.toMatchObject({ status: 429, meta: { retryAfterS: 120 } });
    expect(files.size).toBe(0);
  });

  it('usuario de la sesión inexistente → 401', async () => {
    await expect(new SetAvatar(memoryRepo(), memoryStorage().storage, noLimit).execute('x', webp))
      .rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
  });
});

describe('RemoveAvatar', () => {
  it('con foto subida → borra el archivo y deja null', async () => {
    const repo = memoryRepo(user('1', 'ana')), { files, storage } = memoryStorage();
    await new SetAvatar(repo, storage, noLimit).execute('1', webp);
    await new RemoveAvatar(repo, storage).execute('1');
    expect(files.size).toBe(0);
    expect(await repo.getAvatar('1')).toEqual({ url: null, path: null });
  });

  it('sin foto → 404 NO_AVATAR', async () => {
    await expect(new RemoveAvatar(memoryRepo(user('1', 'ana')), memoryStorage().storage).execute('1'))
      .rejects.toMatchObject({ code: 'NO_AVATAR', status: 404 });
  });

  it('foto de Google (sin ruta) → solo pone null', async () => {
    const google = { ...user('1', 'ana'), avatarUrl: 'https://lh3.googleusercontent.com/a' };
    const repo = memoryRepo(google), { storage } = memoryStorage();
    let removed = 0;
    storage.remove = async () => { removed++; };
    await new RemoveAvatar(repo, storage).execute('1');
    expect([google.avatarUrl, removed]).toEqual([null, 0]);
  });
});

describe('GetUserProfile', () => {
  it('usuario de la sesión inexistente → 401 (no un 404 ni un 500)', async () => {
    await expect(new GetUserProfile(memoryRepo()).execute('x'))
      .rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
  });
});

describe('preferencias', () => {
  it('guardar devuelve lo guardado y el perfil lo trae; restablecer (dos veces) vuelve a los valores por defecto', async () => {
    const repo = memoryRepo(user('1', 'ana'));
    const noche = { ...DEFAULT_PREFERENCES, theme: 'noche' as const, hiddenSections: ['next' as const] };
    expect(await new SaveProfilePreferences(repo).execute('1', noche)).toEqual(noche);
    expect((await new GetUserProfile(repo).execute('1')).preferences).toEqual(noche);
    await new ResetProfilePreferences(repo).execute('1');
    await new ResetProfilePreferences(repo).execute('1');
    expect((await new GetUserProfile(repo).execute('1')).preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('usuario de la sesión inexistente → 401 al guardar y al restablecer', async () => {
    await expect(new SaveProfilePreferences(memoryRepo()).execute('x', DEFAULT_PREFERENCES))
      .rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    await expect(new ResetProfilePreferences(memoryRepo()).execute('x'))
      .rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
  });
});

describe('winRate', () => {
  it('es 0 con 0 partidas y redondea el porcentaje', () => {
    expect(winRate(user('1', 'ana').stats)).toBe(0);
    expect(winRate({ ...user('1', 'ana').stats, gamesPlayed: 3, wins: 2 })).toBe(67);
  });
});
