import { NotFoundError } from '@/core/shared/errors/AppError';
import type { AvatarStorage } from '../domain/AvatarStorage';
import type { UserRepository } from '../domain/UserRepository';
import { userNotFound } from './GetUserProfile';

// quita la foto; si era de Google (sin archivo propio) solo se borra la URL
export class RemoveAvatar {
  constructor(private users: UserRepository, private storage: AvatarStorage) {}

  async execute(userId: string) {
    const current = await this.users.getAvatar(userId);
    if (!current) throw userNotFound();
    if (!current.url) throw new NotFoundError('NO_AVATAR', 'No tienes foto de perfil');
    await this.users.setAvatar(userId, null, null);
    if (current.path) await this.storage.remove(current.path).catch(e => console.error('[avatar] borrar', e));
  }
}
