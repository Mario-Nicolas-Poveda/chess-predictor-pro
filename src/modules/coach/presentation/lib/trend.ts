/** Escala de la gráfica de precisión. Puro: sin React ni DOM, para poder probarlo. */

/** Desde dónde arranca el eje y: como mucho 70, y siempre 10 por debajo de la peor partida (en decenas). */
export const trendFloor = (acc: number[]) => Math.max(0, Math.floor(Math.min(70, Math.min(...acc) - 10) / 10) * 10);

/** La precisión en 0–100 de la escala, para reusar yOf y linePath de evalGraph. */
export const trendPct = (v: number, lo: number) => ((v - lo) / (100 - lo)) * 100;

/** Las líneas guía, de 10 en 10: 50, 60, … 100. */
export const trendTicks = (lo: number) => Array.from({ length: (100 - lo) / 10 + 1 }, (_, i) => lo + i * 10);

/** "23 nov", con la fecha local. */
export const shortDate = (iso: string) => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(Date.parse(iso)).replace('.', '');
