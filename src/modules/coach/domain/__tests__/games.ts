import { Chess } from 'chess.js';
import { chooseMove } from '@/modules/ai-engine/domain/search';
import type { PlayedMove } from '../types';

/** En los tests sí se usa chess.js: pasa de SAN a jugadas con la posición de antes. */
export function game(sans: string[], msLeft: (ply: number) => number | null = () => null): PlayedMove[] {
  const g = new Chess(), moves: PlayedMove[] = [];
  for (const san of sans) {
    const fenBefore = g.fen(), m = g.move(san), ply = moves.length + 1;
    moves.push({ ply, uci: m.from + m.to + (m.promotion ?? ''), san: m.san, fenBefore, msLeft: msLeft(ply) });
  }
  return moves;
}

export const sanOf = (fen: string, uci: string) =>
  new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;

/** Partida del motor contra sí mismo, repetible: el azar de los niveles sale de una semilla fija. */
export function engineGame(plies: number): PlayedMove[] {
  const g = new Chess(), moves: PlayedMove[] = [];
  let seed = 7;
  const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  while (moves.length < plies && !g.isGameOver()) {
    const fenBefore = g.fen(), best = chooseMove(fenBefore, 2, rng)!;
    const m = g.move({ from: best.uci.slice(0, 2), to: best.uci.slice(2, 4), promotion: best.uci[4] });
    moves.push({ ply: moves.length + 1, uci: best.uci, san: m.san, fenBefore, msLeft: null });
  }
  return moves;
}
