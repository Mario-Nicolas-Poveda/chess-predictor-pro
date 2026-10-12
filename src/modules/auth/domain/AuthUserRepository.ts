import type { AuthUser } from './AuthUser';

export interface AuthUserRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  findByUsername(username: string): Promise<AuthUser | null>;
  findByGoogleId(googleId: string): Promise<AuthUser | null>;
  create(data: { email: string; username: string; passwordHash: string | null;
    authProvider: 'local' | 'google'; googleId?: string; displayName?: string; avatarUrl?: string }): Promise<AuthUser>;
  linkGoogle(userId: string, googleId: string): Promise<void>;
}
