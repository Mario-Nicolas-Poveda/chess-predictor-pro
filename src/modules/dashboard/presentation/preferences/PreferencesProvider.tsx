'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_PREFERENCES, type ProfilePreferences } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';
import { useSession } from '../hooks/useProfile';

type Ctx = {
  prefs: ProfilePreferences;
  set: <K extends keyof ProfilePreferences>(key: K, value: ProfilePreferences[K]) => void;
  replace: (p: ProfilePreferences) => void;
};
const PreferencesContext = createContext<Ctx | null>(null);

// Aplica tema y acento en <html>. Lo guardado en la cuenta llega con el perfil; los cambios locales lo pisan.
export function PreferencesProvider({ initial, children }: { initial?: ProfilePreferences; children: ReactNode }) {
  const saved = useSession()?.profile?.preferences ?? initial ?? null;
  const [local, setLocal] = useState<ProfilePreferences | null>(null);
  // null = aún no se conocen: se respeta el tema que puso el script de caché en vez de pisarlo con el de defecto
  const known = local ?? saved;
  const prefs = known ?? DEFAULT_PREFERENCES;
  const theme = known?.theme, accent = known?.accent;

  useEffect(() => {
    const d = document.documentElement;
    if (theme && accent) {
      d.dataset.theme = theme; d.dataset.accent = accent;
      try { localStorage.setItem('cpp:prefs', JSON.stringify({ theme, accent })); } catch {}
    }
    // al salir del dashboard, landing y login vuelven a sus colores fijos
    return () => { delete d.dataset.theme; delete d.dataset.accent; };
  }, [theme, accent]);

  const value = useMemo<Ctx>(() => ({
    prefs,
    set: (key, v) => setLocal(p => ({ ...(p ?? prefs), [key]: v })),
    replace: setLocal,
  }), [prefs]);
  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences necesita <PreferencesProvider>');
  return ctx;
}
