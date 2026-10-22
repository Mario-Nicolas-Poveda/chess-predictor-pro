import type { ProfilePreferences } from '../infrastructure/dto/preferencesSchemas';
import type { UpdateProfileInput } from '../infrastructure/dto/profileSchemas';
import type { User } from './User';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  isUsernameTaken(username: string, exceptId: string): Promise<boolean>;
  update(id: string, patch: UpdateProfileInput): Promise<void>;
  setPreferences(id: string, prefs: Partial<ProfilePreferences>): Promise<boolean>;   // false si el usuario no existe
  // foto de perfil: url pública y ruta en Storage (null si es de Google o no hay). null = el usuario no existe
  getAvatar(id: string): Promise<{ url: string | null; path: string | null } | null>;
  setAvatar(id: string, url: string | null, path: string | null): Promise<void>;
}
