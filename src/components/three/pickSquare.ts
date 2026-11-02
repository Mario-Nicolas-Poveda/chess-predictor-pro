import type { Square } from '@/components/chess/types';

/**
 * La casilla que eligió un rayo, con sus cruces de cerca a lejos. La pieza seleccionada no tapa lo que hay detrás:
 * si el rayo sigue hacia un destino legal, se juega ahí; si no, cuenta como tocarla a ella.
 */
export function pickSquare(hits: Iterable<Square>, selected: Square | null, isDestination: (sq: Square) => boolean): Square | null {
  let throughSelected = false;
  for (const sq of hits) {
    if (sq === selected) { throughSelected = true; continue; }
    return throughSelected && !isDestination(sq) ? selected : sq;
  }
  return throughSelected ? selected : null;
}
