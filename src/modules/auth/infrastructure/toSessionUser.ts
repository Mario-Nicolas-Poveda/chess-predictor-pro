import type { SessionUser } from './dto/sessionSchemas';

interface UserRow {
  id: string; email: string | null; username: string; display_name: string | null; avatar_url: string | null;
  elo_rating: number; role: SessionUser['role']; guest_expires_at: string | null;
}

/** Fila de users (o la que devuelve guest_create/guest_upgrade) → SessionUser, con la fecha en ISO (Z). */
export const toSessionUser = (u: UserRow): SessionUser => ({
  id: u.id, email: u.email, username: u.username, displayName: u.display_name, avatarUrl: u.avatar_url,
  elo: u.elo_rating, role: u.role, guestExpiresAt: u.guest_expires_at ? new Date(u.guest_expires_at).toISOString() : null,
});
