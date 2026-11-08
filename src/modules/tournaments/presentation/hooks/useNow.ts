'use client';
import { useSyncExternalStore } from 'react';

const tick = (cb: () => void) => { const iv = setInterval(cb, 1000); return () => clearInterval(iv); };
const still = () => () => {};
const second = () => Math.floor(Date.now() / 1000) * 1000;

/** La hora del servidor (`Date.now() + skewMs`), al segundo. Avanza sola solo si `ticking`. En el prerender vale 0. */
export function useNow(skewMs: number, ticking: boolean) {
  return useSyncExternalStore(ticking ? tick : still, second, () => 0) + skewMs;
}
