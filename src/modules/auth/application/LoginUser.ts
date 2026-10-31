import { AppError } from '@/core/shared/errors/AppError';
import { toPublic } from '../domain/AuthUser';
import type { AuthUserRepository } from '../domain/AuthUserRepository';
import type { PasswordHasher } from '../domain/PasswordHasher';
import type { LoginInput } from '../infrastructure/dto/authSchemas';

// mismo mensaje si no existe o si la clave es mala
export class LoginUser {
  constructor(private users: AuthUserRepository, private hasher: PasswordHasher,
              private limitIp: (key: string) => Promise<void>,      // 429 si salen muchos intentos de una IP
              private limitEmail: (key: string) => Promise<void>) {} // 429 si van muchos intentos contra una cuenta
  async execute(i: LoginInput, ip: string) {
    await this.limitIp(`login-ip:${ip}`);                           // antes de la BD y del hash, que es lo que cuesta
    await this.limitEmail(`login-email:${i.email}`);
    const u = await this.users.findByEmail(i.email);
    const ok = !!u?.passwordHash && await this.hasher.compare(i.password, u.passwordHash);
    if (!u || !ok) throw new AppError('INVALID_CREDENTIALS', 'Correo o contraseña incorrectos', 401);
    return toPublic(u);
  }
}
