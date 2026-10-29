import { ConflictError } from '@/core/shared/errors/AppError';
import type { AvatarStorage } from '../domain/AvatarStorage';
import type { UserRepository } from '../domain/UserRepository';
import type { UpdateProfileInput } from '../infrastructure/dto/profileSchemas';
import { GetUserProfile } from './GetUserProfile';

export const usernameTaken = () =>
  new ConflictError('USERNAME_TAKEN', 'Ese usuario ya existe', { username: ['No disponible'] });

export class UpdateUserProfile {
  constructor(private users: UserRepository, private storage: AvatarStorage) {}
  async execute(id: string, input: UpdateProfileInput) {
    if (input.username && await this.users.isUsernameTaken(input.username, id)) throw usernameTaken();
    const old = input.avatarUrl !== undefined ? await this.users.getAvatar(id) : null;
    await this.users.update(id, input);
    // avatarUrl a mano reemplaza la foto subida: su archivo queda huérfano y se borra
    if (old?.path) await this.storage.remove(old.path).catch(e => console.error('[avatar] borrar', e));
    return new GetUserProfile(this.users).execute(id);
  }
}
