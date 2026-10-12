'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/apiClient';
import type { Profile } from '@/modules/dashboard/infrastructure/dto/profileSchemas';
import { profileApi } from '../api/profileApi';

export function useProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    profileApi.get().then(r => setProfile(r.profile)).catch(e => {
      if (e instanceof ApiError && e.status === 401) router.replace('/login?next=/dashboard/profile');
      else setError('No pudimos cargar tu perfil.');
    });
  }, [router]);
  useEffect(load, [load]);
  const retry = () => { setError(null); load(); };
  return { profile, setProfile, error, retry };
}
