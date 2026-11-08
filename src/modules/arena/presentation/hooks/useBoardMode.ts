'use client';

import { useSyncExternalStore } from 'react';
import type { BOARD_MODES } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';
import { usePreferences } from '@/modules/dashboard/presentation/preferences/PreferencesProvider';

type BoardMode = (typeof BOARD_MODES)[number];

// sin WebGL se sabe al intentar el 3D una vez; desde ahí, 2D a la fuerza en toda la sesión
let noWebgl = false;
const subs = new Set<() => void>();
const notify = () => subs.forEach(f => f());
export const markNoWebgl = () => { if (noWebgl) return; noWebgl = true; notify(); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

// Celular (#171): sin elección propia, arranca en 2D y three ni se descarga. El servidor rellena boardMode con '3d'
// aunque nadie lo haya elegido, así que "eligió 3D" se recuerda aparte, en este dispositivo, al tocar el interruptor.
const CHOSE_3D = 'cpp:board-3d';
const coarse = () => window.matchMedia('(pointer: coarse)');
const chose3d = () => { try { return localStorage.getItem(CHOSE_3D) === '1'; } catch { return false; } };
const subscribePhone = (f: () => void) => {
  const m = coarse();
  m.addEventListener('change', f);
  const off = subscribe(f);
  return () => { m.removeEventListener('change', f); off(); };
};
/** true: pantalla táctil y nunca eligió 3D aquí. En el servidor, false (escritorio queda igual). */
export const phoneDefault2d = () => coarse().matches && !chose3d();

/** 3D o 2D según las preferencias (y lo que el navegador puede). */
export function useBoardMode() {
  const { prefs, set } = usePreferences();
  const no3d = useSyncExternalStore(subscribe, () => noWebgl, () => false);
  const phone2d = useSyncExternalStore(subscribePhone, phoneDefault2d, () => false);
  return {
    mode: (no3d || phone2d ? '2d' : prefs.boardMode) as BoardMode, no3d,
    setMode: (m: BoardMode) => {
      try { if (m === '3d') localStorage.setItem(CHOSE_3D, '1'); else localStorage.removeItem(CHOSE_3D); } catch {}
      set('boardMode', m);
      notify();
    },
  };
}
