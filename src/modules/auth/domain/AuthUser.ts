import type { PublicUser } from '../infrastructure/dto/authSchemas';

export interface AuthUser {
  id: string; email: string; username: string;
  passwordHash: string | null; authProvider: 'local' | 'google'; googleId: string | null;
}
export const toPublic = (u: AuthUser): PublicUser => ({ id: u.id, email: u.email, username: u.username });
