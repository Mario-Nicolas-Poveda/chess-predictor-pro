'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@/lib/apiClient';
import { DEFAULT_PREFERENCES, type ProfilePreferences } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';
import { preferencesApi } from '../api/preferencesApi';
import { useSession } from '../hooks/useProfile';
import { createSaver, type SaveStatus } from './saver';

type Ctx = {
  prefs: ProfilePreferences;
  status: SaveStatus;
  set: <K extends keyof ProfilePreferences>(key: K, value: ProfilePreferences[K]) => void;
  flush: () => Promise<void>;
  reset: () => Promise<void>;
};
const PreferencesContext = createContext<Ctx | null>(null);
const TO_LOGIN = '/login?next=/dashboard/profile';

// Aplica tema y acento en <html> y guarda cada cambio en la cuenta (optimista, con debounce).
// Lo guardado llega con el perfil; los cambios locales lo pisan. persist=false: solo en memoria (página de muestra).
export function PreferencesProvider({ initial, persist = true, children }: { initial?: ProfilePreferences; persist?: boolean; children: ReactNode }) {
  const router = useRouter();
  const saved = useSession()?.profile?.preferences ?? initial ?? null;
  const [local, setLocal] = useState<ProfilePreferences | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');
  // null = aún no se conocen: se respeta el tema que puso el script de caché en vez de pisarlo con el de defecto
  const known = local ?? saved;
  const prefs = known ?? DEFAULT_PREFERENCES;
  const theme = known?.theme, accent = known?.accent;

  const lastSaved = useRef<ProfilePreferences | null>(null);   // null = lo que trajo el perfil
  const saver = useRef<ReturnType<typeof createSaver> | null>(null);   // solo se usa desde eventos
  useEffect(() => {
    const s = createSaver({
      save: async (p, signal) => (await preferencesApi.save(p, signal)).preferences,
      onStatus: setStatus,
      onSaved: p => { lastSaved.current = p; },
      onRejected: () => { setLocal(lastSaved.current); toast.error('No se pudo guardar esa combinación.'); },
      onUnauthorized: () => router.replace(TO_LOGIN),
    });
    saver.current = s;
    return () => { s.cancel(); saver.current = null; };
  }, [router]);

  useEffect(() => {
    const d = document.documentElement;
    if (theme && accent) {
      d.dataset.theme = theme; d.dataset.accent = accent;
      // solo caché para el anti-parpadeo; la verdad está en la API
      try { localStorage.setItem('cpp:prefs', JSON.stringify({ theme, accent })); } catch {}
    }
    // al salir del dashboard, landing y login vuelven a sus colores fijos
    return () => { delete d.dataset.theme; delete d.dataset.accent; };
  }, [theme, accent]);

  const value = useMemo<Ctx>(() => ({
    prefs, status,
    set: (key, v) => {
      const next = { ...prefs, [key]: v };
      setLocal(next);
      if (persist) saver.current?.schedule(next);
    },
    flush: async () => { await saver.current?.flush(); },
    reset: async () => {
      saver.current?.cancel();
      if (!persist) { setLocal(DEFAULT_PREFERENCES); return; }
      setStatus('saving');
      try {
        await preferencesApi.reset();
        lastSaved.current = DEFAULT_PREFERENCES;
        setLocal(DEFAULT_PREFERENCES);
        setStatus('saved');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) router.replace(TO_LOGIN);
        else setStatus('error');
      }
    },
  }), [prefs, status, persist, router]);
  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences necesita <PreferencesProvider>');
  return ctx;
}
