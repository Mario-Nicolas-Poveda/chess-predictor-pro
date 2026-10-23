import { describe, expect, it } from 'vitest';
import { IllegalMoveError, PromotionRequiredError } from '../../domain/errors';
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

  describe('coronación (exd8 tras una historia corta)', () => {
    const h = moves('h2h4 g7g5 h4g5 g8f6 g5f6 h8g8 f6e7 g8g6');
    it('sin la letra → PromotionRequiredError', () => {
      expect(() => rules.play(h, 'e7d8')).toThrow(PromotionRequiredError);
    });
    it('a caballo: sin jaque y sin dama nueva', () => {
      const r = rules.play(h, 'e7d8n');
      expect(r).toMatchObject({ san: 'exd8=N', check: false });
      expect(r.fen.startsWith('rnbNkb2/')).toBe(true);
    });
    it('a alfil: sin jaque', () => {
      expect(rules.play(h, 'e7d8b')).toMatchObject({ san: 'exd8=B', check: false });
    });
    it('a dama: jaque', () => {
      expect(rules.play(h, 'e7d8q')).toMatchObject({ san: 'exd8=Q+', check: true });
    });
  });

  it('sanAt → SAN en la posición dada; ilegal → IllegalMoveError', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(rules.sanAt(start, 'g1f3')).toBe('Nf3');
    expect(() => rules.sanAt(start, 'e2e5')).toThrow(IllegalMoveError);
  });

  it('enroque corto → O-O', () => {
    expect(rules.play(moves('e2e4 e7e5 g1f3 b8c6 f1c4 g8f6'), 'e1g1').san).toBe('O-O');
  });

  it('20 jugadas legales al empezar', () => {
    expect(rules.legalMoves([])).toHaveLength(20);
  });
});
