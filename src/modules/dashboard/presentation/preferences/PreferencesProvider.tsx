'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_PREFERENCES, type ProfilePreferences } from '@/lib/contracts.tmp';

type Ctx = {
  prefs: ProfilePreferences;
  set: <K extends keyof ProfilePreferences>(key: K, value: ProfilePreferences[K]) => void;
  replace: (p: ProfilePreferences) => void;
};
const PreferencesContext = createContext<Ctx | null>(null);

// Fase local: aplica tema y acento en <html>; el guardado en la cuenta llega con la API de preferencias.
export function PreferencesProvider({ initial, children }: { initial?: ProfilePreferences; children: ReactNode }) {
  // null = aún no se conocen: se respeta el tema que puso el script de caché en vez de pisarlo con el de defecto
  const [known, setKnown] = useState<ProfilePreferences | null>(initial ?? null);
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
    set: (key, v) => setKnown(p => ({ ...(p ?? DEFAULT_PREFERENCES), [key]: v })),
    replace: setKnown,
  }), [prefs]);
  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences necesita <PreferencesProvider>');
  return ctx;
}
