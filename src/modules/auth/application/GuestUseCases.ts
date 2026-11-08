import { GUESTS_MAX, GUEST_TTL_S } from '@/core/shared/auth/roles';
import type { Session } from '@/core/shared/auth/jwt';
import { ConflictError, UnauthorizedError } from '@/core/shared/errors/AppError';
import type { PasswordHasher } from '../domain/PasswordHasher';
import type { RegisterInput } from '../infrastructure/dto/authSchemas';
import type { SessionUser } from '../infrastructure/dto/sessionSchemas';
import type { GuestRepository } from './ports/GuestRepository';

/** POST /auth/guest → 201. Límite por red (10 por hora) y tope global (503). */
export class CreateGuest {
  constructor(private readonly guests: GuestRepository, private readonly limit: (key: string) => Promise<void>) {}
  async execute(ip: string): Promise<SessionUser> {
    await this.limit(`guest-create:${ip}`);
    return this.guests.create(GUEST_TTL_S, GUESTS_MAX);
  }
}

/** POST /auth/guest/upgrade → 200. La misma fila pasa a jugador: se quedan sus partidas contra la IA. */
export class UpgradeGuest {
  constructor(private readonly guests: GuestRepository, private readonly hasher: PasswordHasher) {}
  async execute(s: Session, input: RegisterInput): Promise<SessionUser> {
    if (s.role !== 'guest') throw new ConflictError('ALREADY_REGISTERED', 'Ya tienes cuenta');
    return this.guests.upgrade(s.userId, input.email, input.username, await this.hasher.hash(input.password));
  }
}

/** Al cerrar sesión como invitado, o al entrar con otra cuenta encima de un invitado: se borra. */
export class DropGuest {
  constructor(private readonly guests: GuestRepository) {}
  async execute(s: Session | null, keepUserId?: string): Promise<void> {
    if (!s || s.role !== 'guest' || s.userId === keepUserId) return;
    await this.guests.delete(s.userId);
  }
}

/** GET /auth/me: el usuario completo con su rol. */
export class GetMe {
  constructor(private readonly guests: GuestRepository) {}
  async execute(userId: string): Promise<SessionUser> {
    const u = await this.guests.get(userId);
    if (!u) throw new UnauthorizedError();
    return u;
  }
}
