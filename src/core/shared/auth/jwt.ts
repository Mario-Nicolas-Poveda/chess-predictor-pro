// sin `server-only` ni `env.ts`: lo usa `proxy.ts`
import { SignJWT, jwtVerify } from 'jose';
import { GUEST_TTL_S, parseRole, type Role } from './roles';

export type Session = { userId: string; username: string; role: Role };

function key() {
  const secret = process.env.JWT_SECRET;
  // sin esto, un JWT_SECRET ausente firmaría con la cadena "undefined"
  if (!secret) throw new Error('JWT_SECRET no definido');
  return new TextEncoder().encode(secret);
}

// role obligatorio: un default 'player' convertiría en jugador a un invitado por olvido
export async function signToken(s: Session) {
  return new SignJWT({ username: s.username, role: s.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.userId)
    .setIssuedAt()
    // el invitado vence a los 7 días justos, igual que su fila en la BD
    .setExpirationTime(s.role === 'guest' ? `${GUEST_TTL_S}s` : (process.env.JWT_EXPIRES_IN ?? '7d'))
    .sign(key());
}

export async function verifyToken(token?: string | null): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    return payload.sub ? { userId: payload.sub, username: String(payload.username), role: parseRole(payload.role) } : null;
  } catch { return null; }
}
