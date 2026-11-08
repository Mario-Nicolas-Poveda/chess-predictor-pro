import { describe, expect, it, vi } from 'vitest';
import { authorize } from '../authorize';
import type { Session } from '../jwt';

const guest: Session = { userId: 'g1', username: 'invitado_abc123', role: 'guest' };
const player: Session = { userId: 'u1', username: 'ana', role: 'player' };
const fails = (p: Promise<unknown>, status: number, code: string) => expect(p).rejects.toMatchObject({ status, code });

describe('authorize', () => {
  it('sin sesión → 401', () => fails(authorize(null, 'any', vi.fn()), 401, 'UNAUTHORIZED'));

  it('invitado que ya no existe → 401 SESSION_EXPIRED', () =>
    fails(authorize(guest, 'any', async () => false), 401, 'SESSION_EXPIRED'));

  it('invitado en ruta de jugadores → 403 ACCOUNT_REQUIRED', () =>
    fails(authorize(guest, 'player', async () => true), 403, 'ACCOUNT_REQUIRED'));

  it("invitado vivo en ruta 'any' → pasa", async () => {
    expect(await authorize(guest, 'any', async () => true)).toBe(guest);
  });

  it('un jugador no consulta la BD', async () => {
    const alive = vi.fn();
    expect(await authorize(player, 'player', alive)).toBe(player);
    expect(alive).not.toHaveBeenCalled();
  });
});
