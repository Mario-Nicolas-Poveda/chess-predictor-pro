import { apiFetch } from '@/lib/apiClient';
import type { ProfilePreferences } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';

export const preferencesApi = {
  get: () => apiFetch<{ preferences: ProfilePreferences }>('/profile/preferences', { cache: 'no-store' }),
  save: (p: ProfilePreferences, signal?: AbortSignal) =>
    apiFetch<{ preferences: ProfilePreferences }>('/profile/preferences', { method: 'PUT', body: JSON.stringify(p), signal }),
  reset: () => apiFetch<void>('/profile/preferences', { method: 'DELETE' }),     // 204
};
