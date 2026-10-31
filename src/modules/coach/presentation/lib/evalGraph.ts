/** Geometría de la gráfica de ventaja. Puro: sin React ni DOM, para poder probarlo. */
export interface Box { w: number; h: number; padL: number; padR: number; padT: number; padB: number }

const r1 = (v: number) => Math.round(v * 10) / 10;

/** x del ply `i` (0 = posición inicial) cuando hay `n` puntos. */
export const xOf = (i: number, n: number, b: Box) =>
  r1(b.padL + (n <= 1 ? 0 : (i / (n - 1)) * (b.w - b.padL - b.padR)));

/** y de un porcentaje (100 arriba, 0 abajo). */
export const yOf = (pct: number, b: Box) =>
  r1(b.padT + (1 - Math.max(0, Math.min(100, pct)) / 100) * (b.h - b.padT - b.padB));

/** Línea de la probabilidad de las blancas. */
export function linePath(values: number[], b: Box): string {
  return values.map((v, i) => `${i ? 'L' : 'M'}${xOf(i, values.length, b)} ${yOf(v, b)}`).join('');
}

/** Área bajo la línea, hasta la base (0 %): la "parte de las blancas". */
export function areaPath(values: number[], b: Box): string {
  if (!values.length) return '';
  const n = values.length, base = yOf(0, b);
  return `${linePath(values, b)}L${xOf(n - 1, n, b)} ${base}L${xOf(0, n, b)} ${base}Z`;
}

/** Ply más cercano a una x (para la cruz del cursor y el toque). */
export function nearestIndex(x: number, n: number, b: Box): number {
  if (n <= 1) return 0;
  const t = (x - b.padL) / (b.w - b.padL - b.padR);
  return Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))));
}

/** A qué ply lleva una tecla sobre la gráfica (null: esa tecla no le toca). */
export function keyTarget(key: string, ply: number, n: number): number | null {
  const step = ({ ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 } as Record<string, number>)[key];
  const next = key === 'Home' ? 0 : key === 'End' ? n - 1 : step !== undefined ? ply + step : null;
  return next === null ? null : Math.max(0, Math.min(n - 1, next));
}

/** Puntos de los momentos clave (la probabilidad DESPUÉS de tu jugada). */
export const momentPoints = (winWhite: number[], plies: number[], b: Box) =>
  plies.filter(p => p > 0 && p < winWhite.length)
       .map(p => ({ ply: p, x: xOf(p, winWhite.length, b), y: yOf(winWhite[p]!, b) }));

/** "14… Cxe5" desde el ply y la SAN en español. */
export const moveNumberLabel = (ply: number, sanEs: string) => `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'} ${sanEs}`;

/** Texto de la cruz / del slider: "Blancas 62 % · Negras 38 %". */
export const winText = (pctWhite: number) => {
  const w = Math.round(pctWhite);
  return `Blancas ${w} % · Negras ${100 - w} %`;
};
