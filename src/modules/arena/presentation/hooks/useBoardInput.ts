'use client';

import { useCallback, useState } from 'react';
import type { Move } from 'chess.js';
import type { PieceType, Square } from '@/components/chess/types';

/** Elegir pieza y destino con las jugadas legales; con varias coronaciones posibles abre el diálogo. */
export function useBoardInput(legal: Move[], play: (uci: string) => void) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);

  // toda jugada (tablero, diálogo o texto) limpia la selección
  const go = useCallback((uci: string) => { setSelected(null); setPromo(null); play(uci); }, [play]);

  const onSquare = useCallback((sq: Square) => {
    if (!legal.length) return;
    if (selected) {
      const hit = legal.filter(m => m.from === selected && m.to === sq);
      if (hit.length > 1) { setPromo({ from: selected, to: sq }); return; }   // las 4 coronaciones
      if (hit[0]) { go(hit[0].from + hit[0].to); return; }
    }
    setSelected(legal.some(m => m.from === sq) && sq !== selected ? sq : null);
  }, [legal, selected, go]);

  const moves = legal.filter(m => m.from === selected);
  return {
    selected, promo, onSquare, play: go,
    targets: moves.filter(m => !m.captured).map(m => m.to as Square),
    captures: moves.filter(m => m.captured).map(m => m.to as Square),
    movable: [...new Set(legal.map(m => m.from as Square))],
    promote: (t: PieceType) => { if (promo) go(promo.from + promo.to + t); },
    cancelPromo: () => setPromo(null),
    clear: () => { setSelected(null); setPromo(null); },
  };
}
