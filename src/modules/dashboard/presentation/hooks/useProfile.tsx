'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { parseRole, type Role } from '@/core/shared/auth/roles';
import { ApiError } from '@/lib/apiClient';
import { authApi } from '@/modules/auth/presentation/api/authApi';
import type { Profile } from '@/modules/dashboard/infrastructure/dto/profileSchemas';
import { profileApi } from '../api/profileApi';

/** role: null mientras llega /auth/me. Solo para la interfaz (candados): el servidor decide igual. */
type Session = {
  profile: Profile | null; setProfile: (p: Profile) => void; error: string | null; retry: () => void;
  role: Role | null; guestExpiresAt: string | null;
};
type Me = { role: Role; guestExpiresAt: string | null };

const SessionContext = createContext<Session | null>(null);

// Carga el perfil una vez para todo el dashboard (barra superior y páginas).
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const load = useCallback(() => {
    // en paralelo con el perfil; un token viejo sin role (o /auth/me de antes) es de un jugador
    authApi.me().then(r => setMe({ role: parseRole(r.user.role), guestExpiresAt: r.user.guestExpiresAt ?? null }))
      .catch(() => {});   // el 401 ya lo maneja el perfil
    profileApi.get().then(r => setProfile(r.profile)).catch(e => {
      if (e instanceof ApiError && e.status === 401) router.replace(`/login?next=${encodeURIComponent(location.pathname)}`);
      else setError('No pudimos cargar tu perfil.');
    });
  }, [router]);
  useEffect(load, [load]);
  const retry = () => { setError(null); load(); };
  return (
    <SessionContext value={{ profile, setProfile, error, retry, role: me?.role ?? null, guestExpiresAt: me?.guestExpiresAt ?? null }}>
      {children}
    </SessionContext>
  );
}

/** Sesión o null fuera del dashboard (p. ej. la página de muestra). */
export const useSession = () => useContext(SessionContext);

export function useProfile() {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useProfile necesita <SessionProvider>');
  return s;
}

/** El rol de la sesión (null mientras carga o fuera del dashboard). */
export const useRole = () => useContext(SessionContext)?.role ?? null;
