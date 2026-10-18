import { describe, expect, it } from 'vitest';
import { eloDelta } from '../elo';

describe('eloDelta (K = 32)', () => {
  it('1450 contra 1478: gana +17/−17, pierde −15/+15, tablas +1/−1', () => {
    expect(eloDelta(1450, 1478, 1)).toEqual({ white: 17, black: -17 });
    expect(eloDelta(1450, 1478, 0)).toEqual({ white: -15, black: 15 });
    expect(eloDelta(1450, 1478, 0.5)).toEqual({ white: 1, black: -1 });
  });
});
