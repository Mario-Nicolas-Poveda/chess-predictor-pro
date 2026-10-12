'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/apiClient';
import type { Profile } from '@/modules/dashboard/infrastructure/dto/profileSchemas';
import { profileApi } from '../api/profileApi';

type Session = { profile: Profile | null; setProfile: (p: Profile) => void; error: string | null; retry: () => void };

const SessionContext = createContext<Session | null>(null);

// Carga el perfil una vez para todo el dashboard (barra superior y páginas).
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    profileApi.get().then(r => setProfile(r.profile)).catch(e => {
      if (e instanceof ApiError && e.status === 401) router.replace(`/login?next=${encodeURIComponent(location.pathname)}`);
      else setError('No pudimos cargar tu perfil.');
    });
  }, [router]);
  useEffect(load, [load]);
  const retry = () => { setError(null); load(); };
  return <SessionContext value={{ profile, setProfile, error, retry }}>{children}</SessionContext>;
}

export function useProfile() {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useProfile necesita <SessionProvider>');
  return s;
}
