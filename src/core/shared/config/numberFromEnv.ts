/**
 * Número de una variable de entorno. Vacía o sin definir → `fallback`; un 0 escrito es 0
 * (el `Number(x) || 0.4` de antes convertía TEMPERATURE=0 en 0,4). Fuera de rango o no numérico → aviso y `fallback`.
 */
export function numberFromEnv(
  name: string,
  raw: string | undefined,
  fallback: number,
  range: { min: number; max: number },
  warn: (msg: string) => void = console.warn,
): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < range.min || n > range.max) {
    warn(`[config] ${name}="${raw}" no es un número entre ${range.min} y ${range.max}; se usa ${fallback}`);
    return fallback;
  }
  return n;
}
