import { AppError } from '@/core/shared/errors/AppError';
import { toPublic } from '../domain/AuthUser';
import type { AuthUserRepository } from '../domain/AuthUserRepository';
import type { GoogleIdentity } from '../domain/GoogleIdentity';

const fourDigits = () => String(Math.floor(Math.random() * 10_000)).padStart(4, '0');

export class LoginWithGoogle {
  constructor(private users: AuthUserRepository, private suffix = fourDigits) {}

  async execute(g: GoogleIdentity) {
    // 1. ya entró antes con Google
    const known = await this.users.findByGoogleId(g.sub);
    if (known) return toPublic(known);

    // 2. tiene cuenta local con ese correo → vincular (el callback ya exige email_verified)
    const email = g.email.toLowerCase();
    const local = await this.users.findByEmail(email);
    if (local) {
      await this.users.linkGoogle(local.id, g.sub);
      return toPublic(local);
    }

    // 3. nuevo: parte antes de @ limpia, máx. 15 + 4 dígitos; reintentar si choca
    const base = (email.split('@')[0] ?? '').replace(/[^a-z0-9_]/g, '').slice(0, 15) || 'jugador';
    for (let i = 0; i < 5; i++) {
      const username = base + this.suffix();
      if (await this.users.findByUsername(username)) continue;
      return toPublic(await this.users.create({ email, username, passwordHash: null, authProvider: 'google',
        googleId: g.sub, displayName: g.name, avatarUrl: g.picture }));
    }
    throw new AppError('USERNAME_UNAVAILABLE', 'No se pudo generar un usuario', 500);
  }
}
