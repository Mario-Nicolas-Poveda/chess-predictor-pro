import { describe, expect, it } from 'vitest';
import { bracketSizeFor, deadlineOf, feeders, gamesIn, roundName, roundsFor, seedOrder } from '../bracket';

describe('llave', () => {
  it('tamaño, rondas y partidas por ronda', () => {
    expect([bracketSizeFor(4), bracketSizeFor(5), bracketSizeFor(8)]).toEqual([4, 8, 8]);
    expect([roundsFor(4), roundsFor(8)]).toEqual([2, 3]);
    expect([gamesIn(8, 1), gamesIn(8, 2), gamesIn(8, 3)]).toEqual([4, 2, 1]);
  });
  it('siembra igual que tour_seed_order', () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
  });
  it('nombres de ronda contando desde la final', () => {
    expect([roundName(1, 3), roundName(2, 3), roundName(3, 3), roundName(1, 2)]).toEqual(['Cuartos', 'Semifinal', 'Final', 'Semifinal']);
  });
  it('quién alimenta cada partida y el plazo de la primera jugada', () => {
    expect(feeders(2)).toEqual([3, 4]);
    expect(deadlineOf('2026-11-03T21:00:00.000Z', 300)).toBe('2026-11-03T21:05:00.000Z');
  });
});
