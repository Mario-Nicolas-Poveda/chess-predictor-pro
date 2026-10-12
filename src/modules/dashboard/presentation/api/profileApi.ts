import { apiFetch } from '@/lib/apiClient';
import type { Profile, UpdateProfileInput } from '@/modules/dashboard/infrastructure/dto/profileSchemas';

export const profileApi = {
  get:    ()                          => apiFetch<{ profile: Profile }>('/profile'),
  update: (patch: UpdateProfileInput) => apiFetch<{ profile: Profile }>('/profile', { method: 'PATCH', body: JSON.stringify(patch) }),
};
