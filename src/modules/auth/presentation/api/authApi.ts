import { apiFetch } from '@/lib/apiClient';
import type { LoginInput, PublicUser, RegisterInput } from '@/modules/auth/infrastructure/dto/authSchemas';
import type { SessionUser } from '@/modules/auth/infrastructure/dto/sessionSchemas';

export const authApi = {
  register: (i: RegisterInput) => apiFetch<{ user: PublicUser }>('/auth/register', { method: 'POST', body: JSON.stringify(i) }),
  login:    (i: LoginInput)    => apiFetch<{ user: PublicUser }>('/auth/login',    { method: 'POST', body: JSON.stringify(i) }),
  // Partial: un /auth/me de antes de los roles solo trae id y username
  me:       (signal?: AbortSignal) => apiFetch<{ user: Partial<SessionUser> & { id: string; username: string } }>('/auth/me', { signal }),
};
