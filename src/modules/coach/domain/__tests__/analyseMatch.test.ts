import { describe, expect, it } from 'vitest';
import { analyseMatch, classify, keyMoments, moveAccuracy, winPercent } from '../analyseMatch';
import { engineGame, game, sanOf } from './games';

const review = (sans: string[]) => analyseMatch(game(sans), { sanOf });
const PASTOR = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'];

describe('partidas reales', () => {
  it('mate del pastor: Cf6 permite el mate y era mejor g6', async () => {
    const a = await review(PASTOR);
    expect(a.moves[5]).toMatchObject({ ply: 6, san: 'Nf6', class: 'blunder', motif: 'allowed_mate', best: { san: 'g6' } });
  }, 20_000);

  it('mate del tonto: g4 permite el mate', async () => {
    const a = await review(['f3', 'e5', 'g4', 'Qh4#']);
    expect(a.moves[2]).toMatchObject({ ply: 3, class: 'blunder', motif: 'allowed_mate' });
  }, 20_000);

  it('dama colgada en la última jugada', async () => {
    const a = await review(['e4', 'd5', 'Qg4']);
    expect(a.moves[2]).toMatchObject({ ply: 3, class: 'blunder', motif: 'hanging_piece', piece: 'q' });
  }, 20_000);

  it('captura que no se hizo', async () => {
    const a = await review(['e4', 'd5', 'Qg4', 'c6']);
    expect(a.moves[3]).toMatchObject({ ply: 4, class: 'blunder', motif: 'missed_capture', piece: 'q', best: { san: 'Bxg4' } });
  }, 20_000);

  it('mate que no se dio', async () => {
    const a = await review(['f3', 'e5', 'g4', 'Nc6']);
    expect(a.moves[3]).toMatchObject({ ply: 4, class: 'blunder', motif: 'missed_mate', best: { san: 'Qh4#' } });
  }, 20_000);
});

describe('clases, probabilidad y precisión', () => {
  it.each([[1.9, 'best'], [2, 'good'], [4.9, 'good'], [5, 'inaccuracy'], [9.9, 'inaccuracy'], [10, 'mistake'], [19.9, 'mistake'], [20, 'blunder']])(
    'perder %d puntos es %s', (loss, cls) => { expect(classify(loss as number, false)).toBe(cls); });

  it('la mejor del motor es best aunque cueste puntos', () => {
    expect(classify(30, true)).toBe('best');
  });

  it('winPercent', () => {
    expect(winPercent(0)).toBe(50);
    expect(winPercent(200) + winPercent(-200)).toBeCloseTo(100);
    expect(winPercent(100_000 - 1)).toBe(100);
    expect(winPercent(-100_000 + 1)).toBe(0);
  });

  it('moveAccuracy', () => {
    expect(moveAccuracy(0)).toBeCloseTo(100, 1);
    expect(moveAccuracy(20)).toBeCloseTo(40, 0);
    expect(moveAccuracy(100)).toBe(0);
  });
});

describe('analyseMatch', () => {
  it('una probabilidad por posición y una clase por jugada', async () => {
    const a = await review(PASTOR);
    expect(a.winWhite).toHaveLength(PASTOR.length + 1);
    const total = (c: Record<string, number>) => Object.values(c).reduce((s, n) => s + n, 0);
    expect(total(a.white.counts)).toBe(4);
    expect(total(a.black.counts)).toBe(3);
    expect(a.opening).toBe('Apertura de alfil');
  }, 20_000);

  it('momentos clave: solo tus errores, en orden', async () => {
    expect(keyMoments(await review(PASTOR), 'black').map(m => m.ply)).toEqual([6]);
  }, 20_000);

  // caballos que van y vienen: ningún lado desarrolla ni enroca
  const shuffle = (plies: number) => Array.from({ length: plies }, (_, i) => ['Nf3', 'Nf6', 'Ng1', 'Ng8'][i % 4]!);

  it('hábitos de apertura', async () => {
    const a = await analyseMatch(game(shuffle(30)), { sanOf, depth: 1 });
    expect(a.white.motifs).toMatchObject({ no_castle: 1, undeveloped: 1 });
    expect(a.black.motifs).toMatchObject({ no_castle: 1, undeveloped: 1 });
    expect((await review(PASTOR)).white.motifs.early_queen).toBe(1);
  }, 20_000);

  it('apuros de tiempo: quien perdió por tiempo o jugó las últimas 10 casi sin reloj', async () => {
    const quick = { sanOf, depth: 1 };
    const lost = await analyseMatch(game(PASTOR), { ...quick, result: { winner: 'black', reason: 'timeout' } });
    expect(lost.white.motifs.time_trouble).toBe(1);
    expect(lost.black.motifs.time_trouble).toBeUndefined();

    const low = await analyseMatch(game(shuffle(22), ply => (ply % 2 ? 1_000 : 100_000)), { ...quick, initialMs: 300_000 });
    expect(low.white.motifs.time_trouble).toBe(1);
    expect(low.black.motifs.time_trouble).toBeUndefined();
  }, 20_000);

  it('tablas por tiempo: ninguno perdió por tiempo', async () => {
    const a = await analyseMatch(game(PASTOR), { sanOf, depth: 1, result: { winner: null, reason: 'timeout' } });
    expect(a.white.motifs.time_trouble).toBeUndefined();
    expect(a.black.motifs.time_trouble).toBeUndefined();
  }, 20_000);

  it('no bloquea: otras tareas corren mientras analiza', async () => {
    let ticks = 0;
    const timer = setInterval(() => { ticks++; });
    await review(PASTOR);
    clearInterval(timer);
    expect(ticks).toBeGreaterThan(1);
  }, 20_000);

  it('una partida de 40 medias jugadas no pasa del tope de 500 ms por posición', async () => {
    const moves = engineGame(40);
    expect(moves).toHaveLength(40);
    const t0 = performance.now();
    const a = await analyseMatch(moves, { sanOf });
    expect(a.moves).toHaveLength(40);
    expect(performance.now() - t0).toBeLessThan(20_000);   // medido: ~6 s; el tope absorbe un CI más lento sin fallar al azar
  }, 30_000);
});
