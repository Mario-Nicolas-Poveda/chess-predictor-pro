import type { Role } from '@/core/shared/auth/roles';
import { RegisterSchema } from './authSchemas';

/** Anexo de roles (Sprint 6). Solo tipos y zod: lo importa el navegador. */

/** Pasar de invitado a jugador pide lo mismo que registrarse. */
export const GuestUpgradeSchema = RegisterSchema;

/** Lo que devuelven /auth/me, /auth/guest y /auth/guest/upgrade. */
export interface SessionUser {
  id: string;
  email: string | null;            // null en un invitado
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  elo: number;
  role: Role;
  guestExpiresAt: string | null;   // cuándo se borra el invitado (ISO)
}
