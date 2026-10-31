import { describe, expect, it } from 'vitest';
import { openingName } from '../openings';
import { initialMsOf, START_FEN, toPlayedMoves, type StoredMove } from '../playedMoves';

const stored = (ply: number): StoredMove => ({ ply, uci: `u${ply}`, san: `s${ply}`, fenAfter: `fen${ply}`, whiteMs: 1000 + ply, blackMs: 2000 + ply });

describe('toPlayedMoves', () => {
  it('ordena y da la posición de antes y el reloj de quien movió', () => {
    expect(toPlayedMoves([stored(2), stored(1)], false)).toEqual([
      { ply: 1, uci: 'u1', san: 's1', fenBefore: START_FEN, msLeft: 1001 },
      { ply: 2, uci: 'u2', san: 's2', fenBefore: 'fen1', msLeft: 2002 },
    ]);
  });

  it('un hueco es un error', () => {
    expect(() => toPlayedMoves([stored(1), stored(3)], false)).toThrow('Falta la jugada 2');
  });

  it('sin reloj no hay msLeft', () => {
    expect(toPlayedMoves([stored(1)], true)[0]?.msLeft).toBeNull();
  });
});

describe('initialMsOf', () => {
  it.each([['3+2', 180_000], ['5+0', 300_000], ['10+0', 600_000], ['none', null]])('%s → %s', (tc, ms) => {
    expect(initialMsOf(tc)).toBe(ms);
  });
});

describe('openingName', () => {
  it('gana el prefijo más largo', () => {
    expect(openingName('e2e4 e7e5 g1f3 b8c6 f1c4'.split(' '))).toBe('Italiana');
    expect(openingName('e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d4'.split(' '))).toBe('Italiana');
    expect(openingName(['e2e4', 'c7c5'])).toBe('Siciliana');
  });

  it('una apertura desconocida es null', () => {
    expect(openingName(['h2h3'])).toBeNull();
  });
});
