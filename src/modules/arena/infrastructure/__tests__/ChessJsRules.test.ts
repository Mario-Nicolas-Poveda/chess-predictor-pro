import { describe, expect, it } from 'vitest';
import { IllegalMoveError } from '../../domain/errors';
import { ChessJsRules } from '../ChessJsRules';

const rules = new ChessJsRules();
const moves = (s: string) => s.split(' ');

describe('ChessJsRules', () => {
  it('mate del pastor → checkmate para blancas', () => {
    expect(rules.play(moves('e2e4 e7e5 f1c4 b8c6 d1h5 g8f6'), 'h5f7'))
      .toMatchObject({ san: 'Qxf7#', check: true, outcome: { result: 'white', reason: 'checkmate' } });
  });

  it('jugada ilegal → IllegalMoveError, también con una coronación que sobra', () => {
    expect(() => rules.play([], 'e2e5')).toThrow(IllegalMoveError);
    expect(() => rules.play([], 'e2e4q')).toThrow(IllegalMoveError);
  });

  it('coronación e7e8q → SAN e8=Q', () => {
    expect(rules.play(moves('d2d4 e7e5 c2c3 e5d4 e2e4 g8f6 e4e5 f8c5 e5e6 e8g8 e6e7 b8c6'), 'e7e8q').san).toBe('e8=Q');
  });

  it('enroque corto → O-O', () => {
    expect(rules.play(moves('e2e4 e7e5 g1f3 b8c6 f1c4 g8f6'), 'e1g1').san).toBe('O-O');
  });

  it('20 jugadas legales al empezar', () => {
    expect(rules.legalMoves([])).toHaveLength(20);
  });
});
