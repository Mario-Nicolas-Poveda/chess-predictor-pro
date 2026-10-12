// sin `server-only` ni `env.ts`: lo usa `proxy.ts`
import { SignJWT, jwtVerify } from 'jose';

export type Session = { userId: string; username: string };

function key() {
  const secret = process.env.JWT_SECRET;
  // sin esto, un JWT_SECRET ausente firmaría con la cadena "undefined"
  if (!secret) throw new Error('JWT_SECRET no definido');
  return new TextEncoder().encode(secret);
}

export async function signToken(s: Session) {
  return new SignJWT({ username: s.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.userId)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? '7d')
    .sign(key());
}

export async function verifyToken(token?: string | null): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    return payload.sub ? { userId: payload.sub, username: String(payload.username) } : null;
  } catch { return null; }
}
