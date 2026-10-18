import type { PieceSymbol } from 'chess.js';
import type { MovePicker } from '../domain/MovePicker';
import { replay } from './ChessJsRules';

const VAL: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Bot de desarrollo: mate en 1 si lo hay; si no, gana material sin dejar la pieza colgada, con algo de azar
export class GreedyMovePicker implements MovePicker {
  pick(history: string[]): string {
    const g = replay(history);
    let best = '', bestScore = -Infinity;
    for (const m of g.moves({ verbose: true })) {
      g.move(m);
      const uci = m.from + m.to + (m.promotion ?? '');
      if (g.isCheckmate()) return uci;
      // ¿el rival ataca la casilla de llegada? isAttacked y no sus jugadas: generarlas con SAN tarda ~2 ms cada vez
      const risk = g.isAttacked(m.to, g.turn()) ? VAL[m.promotion ?? m.piece] : 0;
      const score = (m.captured ? VAL[m.captured] : 0) + (m.promotion ? 8 : 0) - risk * 0.9
                  + (g.inCheck() ? 0.3 : 0) + Math.random() * 0.45;
      g.undo();
      if (score > bestScore) { bestScore = score; best = uci; }
    }
    return best;
  }
}
