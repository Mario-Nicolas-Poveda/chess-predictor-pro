import { beforeEach, describe, expect, it } from 'vitest';
import type { AuthUser } from '../../domain/AuthUser';
import type { AuthUserRepository } from '../../domain/AuthUserRepository';
import type { PasswordHasher } from '../../domain/PasswordHasher';
import { LoginUser } from '../LoginUser';
import { RegisterUser } from '../RegisterUser';

// búsqueda sin distinguir mayúsculas, como el ilike del repositorio Supabase
class MemoryRepo implements AuthUserRepository {
  users: AuthUser[] = [];
  private by = (k: 'email' | 'username', v: string) =>
    this.users.find(u => u[k].toLowerCase() === v.toLowerCase()) ?? null;
  async findByEmail(e: string) { return this.by('email', e); }
  async findByUsername(u: string) { return this.by('username', u); }
  async findByGoogleId(g: string) { return this.users.find(u => u.googleId === g) ?? null; }
  async create(d: Parameters<AuthUserRepository['create']>[0]) {
    const u: AuthUser = { id: String(this.users.length + 1), email: d.email, username: d.username,
      passwordHash: d.passwordHash, authProvider: d.authProvider, googleId: d.googleId ?? null };
    this.users.push(u);
    return u;
  }
  async linkGoogle() {}
}
const fakeHasher: PasswordHasher = {
  hash: async p => `hashed:${p}`,
  compare: async (p, h) => h === `hashed:${p}`,
};

let repo: MemoryRepo;
beforeEach(() => { repo = new MemoryRepo(); });

describe('RegisterUser', () => {
  it('crea el usuario con la clave hasheada y devuelve solo datos públicos', async () => {
    const user = await new RegisterUser(repo, fakeHasher).execute({ email: 'ana@test.dev', username: 'ana', password: 'Clave1234' });
    expect(user).toEqual({ id: '1', email: 'ana@test.dev', username: 'ana' });
    expect(repo.users[0]?.passwordHash).toBe('hashed:Clave1234');
  });

  it('EMAIL_TAKEN aunque cambien las mayúsculas', async () => {
    const register = new RegisterUser(repo, fakeHasher);
    await register.execute({ email: 'ana@test.dev', username: 'ana', password: 'Clave1234' });
    await expect(register.execute({ email: 'ANA@test.dev', username: 'otra', password: 'Clave1234' }))
      .rejects.toMatchObject({ code: 'EMAIL_TAKEN', status: 409 });
  });

  it('USERNAME_TAKEN aunque cambien las mayúsculas', async () => {
    const register = new RegisterUser(repo, fakeHasher);
    await register.execute({ email: 'ana@test.dev', username: 'ana', password: 'Clave1234' });
    await expect(register.execute({ email: 'otra@test.dev', username: 'ANA', password: 'Clave1234' }))
      .rejects.toMatchObject({ code: 'USERNAME_TAKEN', status: 409 });
  });
});

describe('LoginUser', () => {
  beforeEach(async () => {
    await new RegisterUser(repo, fakeHasher).execute({ email: 'ana@test.dev', username: 'ana', password: 'Clave1234' });
  });

  it('entra con la clave correcta', async () => {
    await expect(new LoginUser(repo, fakeHasher).execute({ email: 'ana@test.dev', password: 'Clave1234' }))
      .resolves.toEqual({ id: '1', email: 'ana@test.dev', username: 'ana' });
  });

  it('clave mala y correo inexistente dan el mismo error', async () => {
    const login = new LoginUser(repo, fakeHasher);
    const bad = { code: 'INVALID_CREDENTIALS', status: 401 };
    await expect(login.execute({ email: 'ana@test.dev', password: 'Mala1234' })).rejects.toMatchObject(bad);
    await expect(login.execute({ email: 'nadie@test.dev', password: 'Clave1234' })).rejects.toMatchObject(bad);
  });

  it('un usuario de Google sin clave no puede entrar con contraseña', async () => {
    await repo.create({ email: 'g@test.dev', username: 'gina', passwordHash: null, authProvider: 'google', googleId: 'g-1' });
    await expect(new LoginUser(repo, fakeHasher).execute({ email: 'g@test.dev', password: 'cualquiera1' }))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
  });
});
