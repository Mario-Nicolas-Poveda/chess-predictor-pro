import type { SessionUser } from '../../infrastructure/dto/sessionSchemas';

/** Invitados en la BD (funciones SQL de 0010: todo atómico). ¿Sigue vivo? está en core (guestAlive, lo usa withAuth). */
export interface GuestRepository {
  /** guest_create: 503 GUEST_CAPACITY si ya hay demasiados. */
  create(ttlS: number, max: number): Promise<SessionUser>;
  /** guest_upgrade: 409 EMAIL_TAKEN / USERNAME_TAKEN / ALREADY_REGISTERED · 401 SESSION_EXPIRED. */
  upgrade(userId: string, email: string, username: string, passwordHash: string): Promise<SessionUser>;
  /** guest_delete: borra al invitado con sus partidas. Un jugador nunca se borra (devuelve false). */
  delete(userId: string): Promise<boolean>;
  /** El usuario de la sesión (cualquier rol), o null si ya no existe. */
  get(userId: string): Promise<SessionUser | null>;
}
