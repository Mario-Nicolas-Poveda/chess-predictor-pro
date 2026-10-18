import { Chess } from 'chess.js';
import type { GameRules, Outcome, PlayResult } from '../domain/GameRules';
import { IllegalMoveError } from '../domain/errors';

const toMove = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });

// repetir desde el inicio cuesta milisegundos aun con 200 jugadas, y es la única forma de detectar la triple repetición
export class ChessJsRules implements GameRules {
  private replay(history: string[]) {
    const g = new Chess();
    for (const uci of history) g.move(toMove(uci));    // lo guardado ya es legal
    return g;
  }

  play(history: string[], next: string): PlayResult {
    const g = this.replay(history);
    const mover = g.turn() === 'w' ? 'white' : 'black';
    let move;
    try { move = g.move(toMove(next)); }                // chess.js lanza si es ilegal
    catch { throw new IllegalMoveError(next); }
    // chess.js acepta e2e4q como e2e4: la letra de coronación sobrante también es ilegal (se guarda el uci tal cual)
    if ((move.promotion ?? '') !== next.slice(4)) throw new IllegalMoveError(next);
    const outcome: Outcome | null =
      g.isCheckmate()            ? { result: mover, reason: 'checkmate' } :
      g.isStalemate()            ? { result: 'draw', reason: 'stalemate' } :
      g.isInsufficientMaterial() ? { result: 'draw', reason: 'insufficient' } :
      g.isThreefoldRepetition()  ? { result: 'draw', reason: 'threefold' } :
      g.isDrawByFiftyMoves()     ? { result: 'draw', reason: 'fifty' } : null;
    return { san: move.san, fen: g.fen(), check: g.inCheck(), outcome };
  }

  legalMoves(history: string[]) {
    return this.replay(history).moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ''));
  }
}
