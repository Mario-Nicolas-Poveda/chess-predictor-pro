// la misma fórmula de arena_finish (K = 32), para tests y para mostrar. El ELO real lo calcula la BD:
// Math.round y round() de Postgres difieren en -x.5, que con ELOs enteros y K = 32 casi nunca sale
export function eloDelta(white: number, black: number, score: 1 | 0.5 | 0) {
  const e = 1 / (1 + 10 ** ((black - white) / 400));
  return { white: Math.round(32 * (score - e)), black: Math.round(32 * ((1 - score) - (1 - e))) };
}
