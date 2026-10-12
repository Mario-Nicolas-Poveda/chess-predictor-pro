import { AppError } from '@/core/shared/errors/AppError';
import type { UserRepository } from '../domain/UserRepository';

export class GetUserProfile {
  constructor(private users: UserRepository) {}
  async execute(id: string) {
    const u = await this.users.findById(id);
    if (!u) throw new AppError('NOT_FOUND', 'Usuario no encontrado', 404);
    return u;
  }
}
