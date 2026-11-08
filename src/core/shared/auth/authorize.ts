import { AppError, ForbiddenError, UnauthorizedError } from '../errors/AppError';
import { canAccess, type RouteAccess } from './roles';
import type { Session } from './jwt';

/** ¿Este invitado sigue existiendo? (cerró sesión o venció → su fila ya no está). */
export type GuestAlive = (userId: string) => Promise<boolean>;

/**
 * Lo que withAuth hace después de verificar el token. 401 sin sesión · 401 SESSION_EXPIRED si el
 * invitado ya no existe · 403 ACCOUNT_REQUIRED si la ruta es solo para jugadores.
 * Un jugador no consulta la BD.
 */
export async function authorize(s: Session | null, access: RouteAccess, guestAlive: GuestAlive): Promise<Session> {
  if (!s) throw new UnauthorizedError();
  if (s.role === 'guest' && !(await guestAlive(s.userId))) {
    throw new AppError('SESSION_EXPIRED', 'Tu sesión de invitado terminó', 401);
  }
  if (!canAccess(access, s.role)) throw new ForbiddenError('ACCOUNT_REQUIRED', 'Crea tu cuenta para usar esto');
  return s;
}
