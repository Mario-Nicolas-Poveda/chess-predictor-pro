import { SignJWT, decodeJwt } from 'jose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signToken, verifyToken } from '../jwt';
import { GUEST_TTL_S } from '../roles';

const SECRET = 'secreto-de-prueba-con-mas-de-32-caracteres';
beforeEach(() => { vi.stubEnv('JWT_SECRET', SECRET); });

describe('jwt con rol', () => {
  it('el token de invitado lleva role guest y dura 7 días exactos', async () => {
    const t = await signToken({ userId: 'g1', username: 'invitado_abc123', role: 'guest' });
    const p = decodeJwt(t);
    expect(p.role).toBe('guest');
    expect(p.exp! - p.iat!).toBe(GUEST_TTL_S);
    expect(await verifyToken(t)).toEqual({ userId: 'g1', username: 'invitado_abc123', role: 'guest' });
  });

  it('un token de antes, sin role, es de un jugador', async () => {
    const old = await new SignJWT({ username: 'ana' }).setProtectedHeader({ alg: 'HS256' }).setSubject('u1')
      .setIssuedAt().setExpirationTime('7d').sign(new TextEncoder().encode(SECRET));
    expect(await verifyToken(old)).toEqual({ userId: 'u1', username: 'ana', role: 'player' });
  });

  it('cambiar role a mano rompe la firma → null', async () => {
    const [h, , sig] = (await signToken({ userId: 'g1', username: 'x', role: 'guest' })).split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'g1', username: 'x', role: 'player', exp: 9e9 })).toString('base64url');
    expect(await verifyToken(`${h}.${forged}.${sig}`)).toBeNull();
  });
});
