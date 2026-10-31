import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooManyRequestsError } from '@/core/shared/errors/AppError';
import type { AuthUser } from '../../domain/AuthUser';
import type { AuthUserRepository } from '../../domain/AuthUserRepository';
import type { PasswordHasher } from '../../domain/PasswordHasher';
import { LoginUser } from '../LoginUser';
import { LoginWithGoogle } from '../LoginWithGoogle';
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
  async linkGoogle(id: string, g: string) {
    const u = this.users.find(x => x.id === id);
    if (u) u.googleId = g;
  }
}
const fakeHasher: PasswordHasher = {
  hash: async p => `hashed:${p}`,
  compare: async (p, h) => h === `hashed:${p}`,
};

const IP = '203.0.113.7';
const noLimit = async () => {};

let repo: MemoryRepo;
beforeEach(() => { repo = new MemoryRepo(); });
const newRegister = () => new RegisterUser(repo, fakeHasher, noLimit);
const newLogin = () => new LoginUser(repo, fakeHasher, noLimit, noLimit);

describe('RegisterUser', () => {
  it('crea el usuario con la clave hasheada y devuelve solo datos públicos', async () => {
    const user = await newRegister().execute({ email: 'ana@test.dev', username: 'ana', password: 'Clave1234' }, IP);
    expect(user).toEqual({ id: '1', email: 'ana@test.dev', username: 'ana' });
    expect(repo.users[0]?.passwordHash).toBe('hashed:Clave1234');
  });

  it('EMAIL_TAKEN aunque cambien las mayúsculas', async () => {
    const register = newRegister();
    await register.execute({ email: 'ana@test.dev', username: 'ana', password: 'Clave1234' }, IP);
    await expect(register.execute({ email: 'ANA@test.dev', username: 'otra', password: 'Clave1234' }, IP))
      .rejects.toMatchObject({ code: 'EMAIL_TAKEN', status: 409 });
  });

  it('USERNAME_TAKEN aunque cambien las mayúsculas', async () => {
    const register = newRegister();
    await register.execute({ email: 'ana@test.dev', username: 'ana', password: 'Clave1234' }, IP);
    await expect(register.execute({ email: 'otra@test.dev', username: 'ANA', password: 'Clave1234' }, IP))
      .rejects.toMatchObject({ code: 'USERNAME_TAKEN', status: 409 });
  });
});

describe('LoginUser', () => {
  beforeEach(async () => {
    await newRegister().execute({ email: 'ana@test.dev', username: 'ana', password: 'Clave1234' }, IP);
  });

  it('entra con la clave correcta', async () => {
    await expect(newLogin().execute({ email: 'ana@test.dev', password: 'Clave1234' }, IP))
      .resolves.toEqual({ id: '1', email: 'ana@test.dev', username: 'ana' });
  });

  it('clave mala y correo inexistente dan el mismo error', async () => {
    const login = newLogin();
    const bad = { code: 'INVALID_CREDENTIALS', status: 401 };
    await expect(login.execute({ email: 'ana@test.dev', password: 'Mala1234' }, IP)).rejects.toMatchObject(bad);
    await expect(login.execute({ email: 'nadie@test.dev', password: 'Clave1234' }, IP)).rejects.toMatchObject(bad);
  });

  it('un usuario de Google sin clave no puede entrar con contraseña', async () => {
    await repo.create({ email: 'g@test.dev', username: 'gina', passwordHash: null, authProvider: 'google', googleId: 'g-1' });
    await expect(newLogin().execute({ email: 'g@test.dev', password: 'cualquiera1' }, IP))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
  });
});

describe('límite de intentos', () => {
  const blocked = async () => { throw new TooManyRequestsError(30); };
  const rateLimited = { code: 'RATE_LIMITED', status: 429 };
  const ana = { email: 'ana@test.dev', username: 'ana', password: 'Clave1234' };
  afterEach(() => { vi.restoreAllMocks(); });

  it('el login cuenta por IP y por correo', async () => {
    const keys: string[] = [];
    const count = async (k: string) => { keys.push(k); };
    await new LoginUser(repo, fakeHasher, count, count).execute({ email: 'ana@test.dev', password: 'Mala1234' }, IP).catch(() => {});
    expect(keys).toEqual([`login-ip:${IP}`, 'login-email:ana@test.dev']);
  });

  it('con 429 en el login no se consulta la BD ni se calcula el hash', async () => {
    await newRegister().execute(ana, IP);
    const find = vi.spyOn(repo, 'findByEmail');
    const compare = vi.spyOn(fakeHasher, 'compare');
    const attempt = { email: ana.email, password: ana.password };
    await expect(new LoginUser(repo, fakeHasher, blocked, noLimit).execute(attempt, IP)).rejects.toMatchObject(rateLimited);
    await expect(new LoginUser(repo, fakeHasher, noLimit, blocked).execute(attempt, IP)).rejects.toMatchObject(rateLimited);
    expect(find).not.toHaveBeenCalled();
    expect(compare).not.toHaveBeenCalled();
  });

  it('el registro cuenta por IP; con 429 no crea nada ni calcula el hash', async () => {
    const keys: string[] = [];
    await new RegisterUser(repo, fakeHasher, async k => { keys.push(k); }).execute(ana, IP);
    expect(keys).toEqual([`register:${IP}`]);

    const hash = vi.spyOn(fakeHasher, 'hash');
    await expect(new RegisterUser(repo, fakeHasher, blocked).execute({ ...ana, email: 'otra@test.dev', username: 'otra' }, IP))
      .rejects.toMatchObject(rateLimited);
    expect(hash).not.toHaveBeenCalled();
    expect(repo.users).toHaveLength(1);
  });
});

describe('LoginWithGoogle', () => {
  const google = { sub: 'g-123', email: 'Ana.Maria+chess@gmail.com', email_verified: true,
    name: 'Ana María', picture: 'https://lh3.googleusercontent.com/a/foto' };

  it('usuario nuevo: crea cuenta Google sin clave, con username limpio + 4 dígitos', async () => {
    const user = await new LoginWithGoogle(repo, () => '0042').execute(google);
    expect(user).toMatchObject({ email: 'ana.maria+chess@gmail.com', username: 'anamariachess0042' });
    expect(repo.users[0]).toMatchObject({ authProvider: 'google', googleId: 'g-123', passwordHash: null });
  });

  it('si el username generado choca, prueba otro', async () => {
    await repo.create({ email: 'x@test.dev', username: 'anamariachess0001', passwordHash: null, authProvider: 'local' });
    const suffixes = ['0001', '0002'];
    const user = await new LoginWithGoogle(repo, () => suffixes.shift() ?? '9999').execute(google);
    expect(user.username).toBe('anamariachess0002');
  });

  it('cuenta local con el mismo correo: la vincula a Google en vez de duplicarla', async () => {
    await newRegister().execute({ email: 'ana.maria+chess@gmail.com', username: 'ana', password: 'Clave1234' }, IP);
    const user = await new LoginWithGoogle(repo).execute(google);
    expect(user.username).toBe('ana');
    expect(repo.users).toHaveLength(1);
    expect(repo.users[0]?.googleId).toBe('g-123');
  });

  it('ya entró antes con Google: devuelve la misma cuenta', async () => {
    const first = await new LoginWithGoogle(repo, () => '0042').execute(google);
    const again = await new LoginWithGoogle(repo, () => '9999').execute({ ...google, email: 'otro@gmail.com' });
    expect(again).toEqual(first);
    expect(repo.users).toHaveLength(1);
  });
});
