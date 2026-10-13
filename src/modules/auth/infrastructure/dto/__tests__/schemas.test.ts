import { describe, expect, it } from 'vitest';
import { LoginSchema, RegisterSchema } from '../authSchemas';
import { UpdateProfileSchema } from '@/modules/dashboard/infrastructure/dto/profileSchemas';

describe('contratos de auth y perfil', () => {
  it('normaliza el correo a minúsculas', () => {
    expect(LoginSchema.parse({ email: '  Demo@ChessPredictor.DEV ', password: 'x' }).email)
      .toBe('demo@chesspredictor.dev');
  });

  it('rechaza una clave sin número', () => {
    const r = RegisterSchema.safeParse({ email: 'a@b.co', username: 'ana', password: 'solotexto' });
    expect(r.success).toBe(false);
  });

  it('rechaza campos que el usuario no puede editar', () => {
    expect(UpdateProfileSchema.safeParse({ eloRating: 3000 }).success).toBe(false);
    expect(UpdateProfileSchema.safeParse({ email: 'otro@b.co' }).success).toBe(false);
  });
});
