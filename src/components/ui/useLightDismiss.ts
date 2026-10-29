'use client';

import { useEffect, useRef, type RefObject } from 'react';

type Box = EventTarget & { getBoundingClientRect(): { left: number; right: number; top: number; bottom: number } };
type Pointer = Event & { clientX: number; clientY: number };

/**
 * Tocar el fondo o Esc llaman a `onDismiss`. Un clic en el ::backdrop llega al <dialog> con coordenadas
 * fuera de su caja; un clic en su relleno, dentro. Un arrastre que empieza dentro y termina fuera no cierra.
 */
export function bindLightDismiss(d: Box, onDismiss: () => void) {
  let downOutside = false;
  const outside = (e: Pointer) => {
    if (e.target !== d) return false;                       // un clic en el contenido nunca cierra
    const r = d.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  const onDown = (e: Event) => { downOutside = outside(e as Pointer); };
  const onClick = (e: Event) => { if (downOutside && outside(e as Pointer)) onDismiss(); downOutside = false; };
  const onCancel = (e: Event) => { e.preventDefault(); onDismiss(); };   // Esc pasa por el mismo camino que "Listo"
  d.addEventListener('pointerdown', onDown);
  d.addEventListener('click', onClick);
  d.addEventListener('cancel', onCancel);
  return () => {
    d.removeEventListener('pointerdown', onDown);
    d.removeEventListener('click', onClick);
    d.removeEventListener('cancel', onCancel);
  };
}

/**
 * Cierra un <dialog> modal al tocar fuera o con Esc, llamando a `onDismiss`. Con `enabled = false`, Esc no hace nada.
 * Sin `closedby="any"`: Safari no lo soporta y cerraría sin pasar por `onDismiss`.
 */
export function useLightDismiss(ref: RefObject<HTMLDialogElement | null>, onDismiss: () => void, enabled = true) {
  const cb = useRef(onDismiss);
  useEffect(() => { cb.current = onDismiss; });
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!enabled) {
      const block = (e: Event) => e.preventDefault();
      d.addEventListener('cancel', block);
      return () => d.removeEventListener('cancel', block);
    }
    return bindLightDismiss(d, () => cb.current());
  }, [ref, enabled]);
}
