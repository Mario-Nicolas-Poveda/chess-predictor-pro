'use client';

import { useSyncExternalStore } from 'react';
import type { BOARD_MODES } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';
import { usePreferences } from '@/modules/dashboard/presentation/preferences/PreferencesProvider';

// sin WebGL se sabe al intentar el 3D una vez; desde ahí, 2D a la fuerza en toda la sesión
let noWebgl = false;
const subs = new Set<() => void>();
export const markNoWebgl = () => { if (noWebgl) return; noWebgl = true; subs.forEach(f => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
type BoardMode = (typeof BOARD_MODES)[number];
let switched = false;   // el usuario cambió de tablero: al volver al 3D, sin la caída de piezas

/** 3D o 2D según las preferencias (y lo que el navegador puede). */
export function useBoardMode() {
  const { prefs, set } = usePreferences();
  const no3d = useSyncExternalStore(subscribe, () => noWebgl, () => false);
  return {
    mode: (no3d ? '2d' : prefs.boardMode) as BoardMode, no3d, intro: !switched,
    setMode: (m: BoardMode) => { switched = true; set('boardMode', m); },
  };
}
