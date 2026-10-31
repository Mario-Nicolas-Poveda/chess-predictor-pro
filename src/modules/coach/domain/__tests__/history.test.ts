import { describe, expect, it } from 'vitest';
import { aggregate, factsOf, historyFacts, SUMMARY_WINDOW, type FactsRow, type GameResult, type ReviewFacts } from '../history';
import { buildPlanInput } from '../planInput';

const row = (day: number, result: GameResult, over: Partial<ReviewFacts> = {}): FactsRow => ({
  matchId: `m${day}`,
  facts: {
    v: 1, color: 'white', result, reason: 'checkmate', endedAt: `2026-11-${String(day).padStart(2, '0')}T15:00:00.000Z`,
    opponent: 'ai', opening: 'Italiana', plies: 40, accuracy: 70, opponentAccuracy: 60,
    counts: { best: 10, good: 5, inaccuracy: 2, mistake: 2, blunder: 1 },
    errorsByPhase: { opening: 1, middlegame: 3, endgame: 1 },
    motifs: {},
    ...over,
  },
});

describe('historyFacts', () => {
  it('sin partidas previas', () => {
    expect(historyFacts([])).toMatchObject({ games: 0, accuracyAvg: null, streak: null });
  });

  it('racha desde la más nueva, sin importar el orden de entrada', () => {
    const h = historyFacts([row(1, 'loss'), row(4, 'loss'), row(2, 'win'), row(3, 'loss')]);
    expect(h).toMatchObject({ games: 4, accuracyAvg: 70, blundersPerGame: 1, worstPhase: 'middlegame', streak: '2 derrotas seguidas' });
  });

  it('una sola no es racha', () => {
    expect(historyFacts([row(2, 'win'), row(1, 'loss')]).streak).toBeNull();
  });

  it('el motivo más repetido', () => {
    const h = historyFacts([row(1, 'win', { motifs: { allowed_mate: 1, no_castle: 3 } }), row(2, 'win', { motifs: { allowed_mate: 1 } })]);
    expect(h.topMotif).toBe('no_castle');
  });

  it('solo mira las 10 más recientes', () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(i + 1, 'win'));
    expect(historyFacts(rows).games).toBe(10);
  });
});

describe('aggregate', () => {
  it('la tendencia va de la más vieja a la más nueva', () => {
    const { stats } = aggregate([row(3, 'win', { accuracy: 80 }), row(1, 'loss', { accuracy: 60 }), row(2, 'win', { accuracy: 70 })], 1200);
    expect(stats.accuracyTrend.map(t => t.matchId)).toEqual(['m1', 'm2', 'm3']);
    expect(stats.accuracyAvg).toBe(70);
  });

  it('una derrota por tiempo cuenta en timeouts', () => {
    const { plan } = aggregate([row(1, 'loss', { reason: 'timeout' }), row(2, 'loss'), row(3, 'win', { reason: 'timeout' })], 1200);
    expect(plan.results).toEqual({ wins: 1, draws: 0, losses: 2, timeouts: 1 });
  });

  it('agrupa las aperturas por nombre y color', () => {
    const { stats } = aggregate([row(1, 'win'), row(2, 'loss'), row(3, 'draw', { color: 'black' }), row(4, 'win', { opening: null })], 1200);
    expect(stats.openings).toEqual([
      { name: 'Italiana', color: 'white', games: 2, wins: 1, draws: 0, losses: 1 },
      { name: 'Italiana', color: 'black', games: 1, wins: 0, draws: 1, losses: 0 },
    ]);
  });

  it('el motivo dice la partida más reciente donde pasó', () => {
    const { stats } = aggregate([row(1, 'win', { motifs: { allowed_mate: 2 } }), row(2, 'win', { motifs: { allowed_mate: 1 } }), row(3, 'win')], 1200);
    expect(stats.topMotifs).toEqual([{ motif: 'allowed_mate', count: 3, lastMatchId: 'm2' }]);
  });

  it('usa solo las últimas 20', () => {
    const rows = Array.from({ length: SUMMARY_WINDOW + 5 }, (_, i) => row((i % 28) + 1, 'win'));
    expect(aggregate(rows, 1200).stats.games).toBe(SUMMARY_WINDOW);
  });

  it('la tendencia del plan compara la mitad vieja con la nueva', () => {
    const acc = (...xs: number[]) => xs.map((accuracy, i) => row(i + 1, 'win', { accuracy }));
    expect(buildPlanInput(aggregate(acc(60, 60, 99, 70, 70), 1200).plan).tendencia).toBe('mejorando');
    expect(buildPlanInput(aggregate(acc(70, 70, 60, 60), 1200).plan).tendencia).toBe('empeorando');
    expect(buildPlanInput(aggregate(acc(70, 71, 70, 71), 1200).plan).tendencia).toBe('estable');
  });
});

describe('factsOf', () => {
  it('resume la partida desde tu lado', async () => {
    const side = { accuracy: 66, counts: { best: 1, good: 0, inaccuracy: 0, mistake: 0, blunder: 1 }, errorsByPhase: { opening: 1, middlegame: 0, endgame: 0 }, motifs: { allowed_mate: 1 } };
    const a = { version: 1 as const, depth: 3, plies: 7, opening: 'Apertura de alfil', winWhite: [], moves: [], white: { ...side, accuracy: 90 }, black: side };
    expect(factsOf(a, 'black', { result: 'loss', reason: 'checkmate', endedAt: '2026-11-01T10:00:00.000Z', opponent: 'human' }))
      .toMatchObject({ color: 'black', accuracy: 66, opponentAccuracy: 90, plies: 7, opening: 'Apertura de alfil', motifs: { allowed_mate: 1 } });
  });
});
