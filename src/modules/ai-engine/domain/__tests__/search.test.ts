import { describe, expect, it } from 'vitest';
import { analyse, chooseMove, predict } from '../search';
import { apply, fromFen, inCheck, legal, toUci } from '../position';
import type { AiLevelId } from '../levels';

// tras e2e4 e7e5 f1c4 b8c6 d1h5 g8f6: Dxf7 es mate
const PASTOR = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
// las blancas están en mate (mate del loco)
const MATED = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const half = () => 0.5;   // azar neutro: los tests no dependen de la suerte

describe('motor de IA', () => {
  it.each([2, 3, 4, 5] as AiLevelId[])('nivel %i encuentra el mate del pastor (Dxf7#)', { timeout: 20_000 }, level => {
    expect(chooseMove(PASTOR, level, half)?.uci).toBe('h5f7');
  });

  it('la posición del bug: torre en g8 no da jaque; dama sí', () => {
    const pos = fromFen('8/p5P1/1p2k3/2p5/8/8/PP3PPP/R5K1 w - - 0 1');
    const after = (uci: string) => apply(pos, legal(pos).find(m => toUci(m) === uci)!);
    expect(inCheck(after('g7g8r'))).toBe(false);
    expect(inCheck(after('g7g8q'))).toBe(true);
  });

  it('sin jugadas legales → null; la predicción da 0 para blancas y ninguna jugada', () => {
    expect(chooseMove(MATED, 3, half)).toBeNull();
    expect(predict(MATED)).toEqual({ white: 0, top: [], depth: 0 });
  });

  it('predicción: hasta 3 jugadas que suman 100 y ventaja entre 0 y 1', () => {
    const p = predict(START);
    expect(p.top).toHaveLength(3);
    expect(p.top.reduce((s, x) => s + x.pct, 0)).toBe(100);
    expect(p.white).toBeGreaterThan(0);
    expect(p.white).toBeLessThan(1);
  });

  it('con el tiempo agotado se queda con la última profundidad completa', () => {
    let t = 0;
    const now = () => (t += 1000);   // cada consulta del reloj avanza 1 s
    const a = analyse(fromFen(START), { depth: 5, quiesce: false, ms: 500, now });
    expect(a.depth).toBe(2);          // la 3 se corta a los 512 nodos
    expect(a.scored).toHaveLength(20);
  });

  it('con el mismo azar elige siempre la misma jugada', () => {
    expect(chooseMove(START, 1, half)?.uci).toBe(chooseMove(START, 1, half)?.uci);
  });
});
