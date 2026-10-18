import { Chess, type Move } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { GreedyMovePicker } from '../GreedyMovePicker';

const picker = new GreedyMovePicker();
const uci = (m: Move) => m.from + m.to + (m.promotion ?? '');

describe('GreedyMovePicker', () => {
  it('elige el mate en 1 (Dxf7# del pastor)', () => {
    expect(picker.pick('e2e4 e7e5 f1c4 b8c6 d1h5 g8f6'.split(' '))).toBe('h5f7');
  });

  // chess.js gasta CPU al repetir cada partida: con todos los tests en paralelo, 5 s no alcanzan
  it('siempre devuelve una jugada legal (100 posiciones, alternando jugadas al azar y del bot)', { timeout: 15_000 }, () => {
    let g = new Chess();
    let history: string[] = [];
    for (let i = 0; i < 200; i++) {
      if (g.isGameOver() || history.length >= 30) { g = new Chess(); history = []; }
      const legal = g.moves({ verbose: true }).map(uci);
      const u = i % 2 ? picker.pick(history) : legal[Math.floor(Math.random() * legal.length)] as string;
      expect(legal).toContain(u);
      g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      history.push(u);
    }
  });
});
