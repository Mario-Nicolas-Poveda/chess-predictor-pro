import { describe, expect, it, vi } from 'vitest';
import type { Session } from '@/core/shared/auth/jwt';
import type { PasswordHasher } from '../../domain/PasswordHasher';
import type { SessionUser } from '../../infrastructure/dto/sessionSchemas';
import { toSessionUser } from '../../infrastructure/toSessionUser';
import type { GuestRepository } from '../ports/GuestRepository';
import { CreateGuest, DropGuest, GetMe, UpgradeGuest } from '../GuestUseCases';

const user = (role: SessionUser['role']): SessionUser => ({ id: 'g1', email: null, username: 'invitado_abc123',
  displayName: 'Invitado', avatarUrl: null, elo: 1200, role, guestExpiresAt: null });
const repo = () => ({
  create: vi.fn<GuestRepository['create']>(async () => user('guest')),
  upgrade: vi.fn<GuestRepository['upgrade']>(async () => user('player')),
  delete: vi.fn<GuestRepository['delete']>(async () => true),
  get: vi.fn<GuestRepository['get']>(async () => null),
});
const hasher: PasswordHasher = { hash: async p => `hashed:${p}`, compare: async () => false };
const guest: Session = { userId: 'g1', username: 'invitado_abc123', role: 'guest' };
const player: Session = { userId: 'u1', username: 'ana', role: 'player' };
const input = { email: 'n@t.dev', username: 'nuevo1', password: 'Clave1234' };

describe('invitados', () => {
  it('crear gasta el límite de su red y pide 7 días y 1000 de cupo', async () => {
    const r = repo(); const limit = vi.fn(async () => {});
    await new CreateGuest(r, limit).execute('203.0.113.7');
    expect(limit).toHaveBeenCalledWith('guest-create:203.0.113.7');
    expect(r.create).toHaveBeenCalledWith(604_800, 1000);
  });

  it('si el límite falla, no crea', async () => {
    const r = repo();
    await expect(new CreateGuest(r, async () => { throw new Error('429'); }).execute('ip')).rejects.toThrow('429');
    expect(r.create).not.toHaveBeenCalled();
  });

  it('convertir a un jugador → 409 ALREADY_REGISTERED sin tocar la BD', async () => {
    const r = repo();
    await expect(new UpgradeGuest(r, hasher).execute(player, input)).rejects.toMatchObject({ status: 409, code: 'ALREADY_REGISTERED' });
    expect(r.upgrade).not.toHaveBeenCalled();
  });

  it('convertir a un invitado → misma fila y la clave con hash', async () => {
    const r = repo();
    expect((await new UpgradeGuest(r, hasher).execute(guest, input)).role).toBe('player');
    expect(r.upgrade).toHaveBeenCalledWith('g1', 'n@t.dev', 'nuevo1', 'hashed:Clave1234');
  });

  it('DropGuest borra al invitado, pero no a un jugador, ni sin sesión, ni a la cuenta con la que se entra', async () => {
    const r = repo(); const drop = new DropGuest(r);
    await drop.execute(player); await drop.execute(null); await drop.execute(guest, 'g1');
    expect(r.delete).not.toHaveBeenCalled();
    await drop.execute(guest, 'u1');
    expect(r.delete).toHaveBeenCalledWith('g1');
  });

  it('GetMe: el usuario borrado → 401', async () => {
    await expect(new GetMe(repo()).execute('g1')).rejects.toMatchObject({ status: 401 });
  });

  it('toSessionUser normaliza guest_expires_at a ISO con Z', () => {
    const u = toSessionUser({ id: 'g1', email: null, username: 'invitado_abc123', display_name: 'Invitado', avatar_url: null,
      elo_rating: 1200, role: 'guest', guest_expires_at: '2026-11-14 23:10:00+00' });
    expect(u.guestExpiresAt).toBe('2026-11-14T23:10:00.000Z');
    expect(u).toMatchObject({ displayName: 'Invitado', elo: 1200, email: null });
  });
});
