export type Quality = 'high' | 'low';

// Baja con ≤ 4 núcleos, ≤ 4 GB o pantalla táctil.
export function detectQuality(): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const low = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || matchMedia('(pointer: coarse)').matches;
  return low ? 'low' : 'high';
}
