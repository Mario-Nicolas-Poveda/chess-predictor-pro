import { ConflictError } from '@/core/shared/errors/AppError';
import { toPublic } from '../domain/AuthUser';
import type { AuthUserRepository } from '../domain/AuthUserRepository';
import type { PasswordHasher } from '../domain/PasswordHasher';
import type { RegisterInput } from '../infrastructure/dto/authSchemas';

export class RegisterUser {
  constructor(private users: AuthUserRepository, private hasher: PasswordHasher,
              private limit: (key: string) => Promise<void>) {}     // 429 si salen muchos registros de una IP
  async execute(i: RegisterInput, ip: string) {
    await this.limit(`register:${ip}`);
    if (await this.users.findByEmail(i.email))
      throw new ConflictError('EMAIL_TAKEN', 'Ese correo ya está registrado', { email: ['Ya registrado'] });
    if (await this.users.findByUsername(i.username))
      throw new ConflictError('USERNAME_TAKEN', 'Ese usuario ya existe', { username: ['No disponible'] });
    const user = await this.users.create({ email: i.email, username: i.username,
      passwordHash: await this.hasher.hash(i.password), authProvider: 'local' });
    return toPublic(user);
  }
}
