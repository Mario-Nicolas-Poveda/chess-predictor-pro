import { UnauthorizedError } from '@/core/shared/errors/AppError';
import type { UserRepository } from '../domain/UserRepository';

// el id sale siempre de la sesión: si el usuario ya no existe (p. ej. borrado), la sesión no vale → 401 y el cliente va al login
export const userNotFound = () => new UnauthorizedError();

export class GetUserProfile {
  constructor(private users: UserRepository) {}
  async execute(id: string) {
    const u = await this.users.findById(id);
    if (!u) throw userNotFound();
    return u;
  }
}
