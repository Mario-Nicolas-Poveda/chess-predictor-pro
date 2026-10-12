import { apiFetch } from '@/lib/apiClient';
import type { LoginInput, PublicUser, RegisterInput } from '@/modules/auth/infrastructure/dto/authSchemas';

export const authApi = {
  register: (i: RegisterInput) => apiFetch<{ user: PublicUser }>('/auth/register', { method: 'POST', body: JSON.stringify(i) }),
  login:    (i: LoginInput)    => apiFetch<{ user: PublicUser }>('/auth/login',    { method: 'POST', body: JSON.stringify(i) }),
  logout:   ()                 => apiFetch<void>('/auth/logout', { method: 'POST' }),
  me:       ()                 => apiFetch<{ user: { id: string; username: string } }>('/auth/me'),
};
