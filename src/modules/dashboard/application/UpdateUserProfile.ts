import { AppError } from '@/core/shared/errors/AppError';
import type { UserRepository } from '../domain/UserRepository';
import type { UpdateProfileInput } from '../infrastructure/dto/profileSchemas';
import { GetUserProfile } from './GetUserProfile';

export const usernameTaken = () =>
  new AppError('USERNAME_TAKEN', 'Ese usuario ya existe', 409, { username: ['No disponible'] });

export class UpdateUserProfile {
  constructor(private users: UserRepository) {}
  async execute(id: string, input: UpdateProfileInput) {
    if (input.username && await this.users.isUsernameTaken(input.username, id)) throw usernameTaken();
    await this.users.update(id, input);
    return new GetUserProfile(this.users).execute(id);
  }
}
