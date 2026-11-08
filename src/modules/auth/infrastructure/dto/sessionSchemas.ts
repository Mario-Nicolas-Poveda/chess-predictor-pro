import type { Role } from '@/core/shared/auth/roles';
import { RegisterSchema } from './authSchemas';

/** Nuevo · Sprint 6 anexo. Solo tipos y zod: lo importa el navegador. */

/** Pasar de invitado a jugador pide lo mismo que registrarse. */
export const GuestUpgradeSchema = RegisterSchema;

/** Lo que devuelven /auth/me, /auth/guest, /auth/guest/upgrade, /auth/login y /auth/register (campos nuevos al final). */
export interface SessionUser {
  id: string;
  email: string | null;            // null en un invitado
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  elo: number;
  role: Role;                      // nuevo
  guestExpiresAt: string | null;   // nuevo: cuándo se borra el invitado
}
