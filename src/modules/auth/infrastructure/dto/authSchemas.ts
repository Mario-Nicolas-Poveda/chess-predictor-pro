import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email('Correo inválido'));

export const usernameSchema = z.string().trim().min(3, 'Mínimo 3 caracteres').max(20, 'Máximo 20')
  .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y _');
export const passwordSchema = z.string().min(8, 'Mínimo 8 caracteres').max(72)
  .regex(/[A-Za-z]/, 'Debe tener una letra').regex(/\d/, 'Debe tener un número');

export const RegisterSchema = z.object({ email, username: usernameSchema, password: passwordSchema });
export const LoginSchema = z.object({ email, password: z.string().min(1, 'Escribe tu contraseña') });
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type PublicUser = { id: string; email: string; username: string };
