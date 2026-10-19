import { describe, expect, it } from 'vitest';
import { LocalGame } from '../local/localGame';

describe('partida local', () => {
  it('el bot da mate en 1 cuando puede (mate del pastor)', () => {
    const g = new LocalGame(['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6']);
    expect(g.botPick(() => 0)).toBe('h5f7');
    g.play('h5f7');
    expect(g.over()).toEqual({ winner: 'white', reason: 'checkmate' });
  });

  it('prefiere capturar una pieza sin defensa a perder la suya', () => {
    // negras mueven: pueden comerse la dama colgada de h5 con el caballo de f6
    const g = new LocalGame(['e2e4', 'g8f6', 'd1h5']);
    expect(g.botPick(() => 0)).toBe('f6h5');
  });

  it('rechaza jugadas ilegales y solo acepta tablas desde la jugada 10', () => {
    const g = new LocalGame();
    expect(g.play('e2e5')).toBeNull();
    expect(g.acceptsDraw()).toBe(false);
  });
});
