import { NotFoundError } from '@/core/shared/errors/AppError';
import type { UserRepository } from '../domain/UserRepository';

export class GetUserProfile {
  constructor(private users: UserRepository) {}
  async execute(id: string) {
    const u = await this.users.findById(id);
    if (!u) throw new NotFoundError('NOT_FOUND', 'Usuario no encontrado');
    return u;
  }
}
