/** Recorte circular: el círculo mide `d` px en pantalla; la imagen se puede mover y ampliar, pero siempre lo cubre. */
export interface Crop { w: number; h: number; zoom: number; ox: number; oy: number }   // ox, oy: esquina de la imagen respecto al círculo
export const baseScale = (c: Pick<Crop, 'w' | 'h'>, d: number) => Math.max(d / c.w, d / c.h);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function centered(w: number, h: number, d: number): Crop {
  const s = baseScale({ w, h }, d);
  return { w, h, zoom: 1, ox: (d - w * s) / 2, oy: (d - h * s) / 2 };
}
export function moveBy(c: Crop, dx: number, dy: number, d: number): Crop {
  const s = baseScale(c, d) * c.zoom;
  return { ...c, ox: clamp(c.ox + dx, d - c.w * s, 0), oy: clamp(c.oy + dy, d - c.h * s, 0) };
}
/** Cambia el zoom manteniendo fijo el centro del círculo. */
export function zoomTo(c: Crop, zoom: number, d: number): Crop {
  const s0 = baseScale(c, d), sOld = s0 * c.zoom, sNew = s0 * zoom;
  const cx = (d / 2 - c.ox) / sOld, cy = (d / 2 - c.oy) / sOld;
  return { ...c, zoom, ox: clamp(d / 2 - cx * sNew, d - c.w * sNew, 0), oy: clamp(d / 2 - cy * sNew, d - c.h * sNew, 0) };
}
/** Rectángulo de la imagen original que cae dentro del círculo (para drawImage). */
export function sourceRect(c: Crop, d: number) {
  const s = baseScale(c, d) * c.zoom;
  return { sx: -c.ox / s, sy: -c.oy / s, size: d / s };
}
