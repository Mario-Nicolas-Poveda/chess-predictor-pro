import bcrypt from 'bcryptjs';
import type { PasswordHasher } from '../domain/PasswordHasher';

export class BcryptPasswordHasher implements PasswordHasher {
  hash(p: string) { return bcrypt.hash(p, 10); }
  compare(p: string, h: string) { return bcrypt.compare(p, h); }
}
