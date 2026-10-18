import { Chess, type Move } from 'chess.js';
import { PIECE_VALUE } from '@/components/chess/glyphs';
import type { PieceType } from '@/components/chess/types';
import type { Color, EndReason } from '@/modules/arena/infrastructure/dto/arenaSchemas';

export type LocalMove = { uci: string; san: string };
const uciOf = (m: Move) => m.from + m.to + (m.promotion ?? '');
const other = (c: 'w' | 'b') => (c === 'w' ? 'b' : 'w');

/** Partida local con chess.js y el bot "greedy" de la vista (para /dev/arena y los mocks de la arena). */
export class LocalGame {
  private chess = new Chess();
  readonly moves: LocalMove[] = [];

  constructor(ucis: string[] = []) { ucis.forEach(u => this.play(u)); }

  get turn(): Color { return this.chess.turn() === 'w' ? 'white' : 'black'; }
  get ply() { return this.moves.length; }
  legal(): Move[] { return this.chess.moves({ verbose: true }); }

  /** Juega una jugada UCI; null si es ilegal. */
  play(uci: string): LocalMove | null {
    try {
      const m = this.chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      const mv = { uci: uciOf(m), san: m.san };
      this.moves.push(mv);
      return mv;
    } catch { return null; }
  }

  /** null mientras se juega; si terminó, el ganador (null en tablas) y el motivo. */
  over(): { winner: Color | null; reason: EndReason } | null {
    const c = this.chess;
    if (c.isCheckmate()) return { winner: c.turn() === 'w' ? 'black' : 'white', reason: 'checkmate' };
    if (c.isStalemate()) return { winner: null, reason: 'stalemate' };
    if (c.isInsufficientMaterial()) return { winner: null, reason: 'insufficient' };
    if (c.isThreefoldRepetition()) return { winner: null, reason: 'threefold' };
    if (c.isDraw()) return { winner: null, reason: 'fifty' };
    return null;
  }

  /** El bot acepta tablas desde la jugada 10. */
  acceptsDraw() { return Math.ceil(this.ply / 2) >= 10; }

  /** Mate en 1 si puede; si no, la de más material ganado menos el riesgo (con un poco de azar). */
  botPick(random = Math.random): string | null {
    const c = this.chess, me = c.turn();
    let best: string | null = null, bestScore = -Infinity;
    for (const m of this.legal()) {
      c.move(m);
      if (c.isCheckmate()) { c.undo(); return uciOf(m); }
      const moved: PieceType = (m.promotion as PieceType | undefined) ?? m.piece;
      const gain = m.captured ? PIECE_VALUE[m.captured] : 0;
      const risk = c.isAttacked(m.to, other(me)) ? PIECE_VALUE[moved] : 0;
      const score = gain + (m.promotion ? 8 : 0) - risk * .9 + (c.inCheck() ? .3 : 0) + random() * .45;
      c.undo();
      if (score > bestScore) { bestScore = score; best = uciOf(m); }
    }
    return best;
  }
}

/** El bot contesta entre 650 y 1550 ms. */
export const botDelay = (random = Math.random) => 650 + random() * 900;
