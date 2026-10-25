'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const FocusCtx = createContext<{ focus: boolean; setFocus: (v: boolean) => void }>({ focus: false, setFocus: () => {} });

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState(false);
  const value = useMemo(() => ({ focus, setFocus }), [focus]);
  return <FocusCtx value={value}>{children}</FocusCtx>;
}

/** Lo que va dentro (la cabecera con el menú de módulos) no se pinta en modo enfoque. */
export function HiddenInFocus({ children }: { children: ReactNode }) {
  return useContext(FocusCtx).focus ? null : children;
}

/** Mientras `active` sea true, el dashboard no pinta su cabecera (ni el menú de módulos). */
export function useFocusMode(active: boolean) {
  const { setFocus } = useContext(FocusCtx);
  useEffect(() => {
    setFocus(active);
    return () => setFocus(false);
  }, [active, setFocus]);
}
