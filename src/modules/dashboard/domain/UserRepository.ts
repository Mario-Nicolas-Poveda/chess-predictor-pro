import type { UpdateProfileInput } from '../infrastructure/dto/profileSchemas';
import type { User } from './User';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  isUsernameTaken(username: string, exceptId: string): Promise<boolean>;
  update(id: string, patch: UpdateProfileInput): Promise<void>;
}
