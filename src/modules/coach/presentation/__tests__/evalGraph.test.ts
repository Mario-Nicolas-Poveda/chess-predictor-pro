import { describe, expect, it } from 'vitest';
import { areaPath, keyTarget, linePath, momentPoints, moveNumberLabel, nearestIndex, winText, xOf, yOf, type Box } from '../lib/evalGraph';
import { momentArrows } from '../lib/moveClass';
import review from '../api/__fixtures__/review.pastor.json';
import type { ReviewMoveDTO } from '@/modules/coach/infrastructure/dto/coachSchemas';

const b: Box = { w: 300, h: 120, padL: 0, padR: 0, padT: 10, padB: 10 };

describe('evalGraph', () => {
  it('posiciones de inicio y final', () => {
    expect(xOf(0, 3, b)).toBe(0);
    expect(xOf(2, 3, b)).toBe(300);
    expect(xOf(0, 1, b)).toBe(0);
  });

  it('100, 50 y 0 % y recorte', () => {
    expect([yOf(100, b), yOf(50, b), yOf(0, b)]).toEqual([10, 60, 110]);
    expect([yOf(140, b), yOf(-5, b)]).toEqual([10, 110]);
  });

  it('línea y área cerrada hasta la base', () => {
    expect(linePath([50, 76, 24], b)).toBe('M0 60L150 34L300 86');
    expect(areaPath([50, 76, 24], b)).toBe('M0 60L150 34L300 86L300 110L0 110Z');
    expect(areaPath([], b)).toBe('');
  });

  it('ply más cercano, también fuera de la gráfica', () => {
    expect(nearestIndex(160, 3, b)).toBe(1);
    expect(nearestIndex(-40, 3, b)).toBe(0);
    expect(nearestIndex(900, 3, b)).toBe(2);
    expect(nearestIndex(50, 1, b)).toBe(0);
  });

  it('ignora los momentos fuera de rango', () => {
    expect(momentPoints([50, 60, 70], [0, 1, 9], b).map(p => p.ply)).toEqual([1]);
  });

  it('textos', () => {
    expect(winText(61.6)).toBe('Blancas 62 % · Negras 38 %');
    expect(moveNumberLabel(28, 'Cxe5')).toBe('14… Cxe5');
    expect(moveNumberLabel(27, 'd4')).toBe('14. d4');
  });

  it('teclas: flechas ±1, páginas ±10, inicio y fin, sin salirse', () => {
    expect(keyTarget('ArrowRight', 3, 8)).toBe(4);
    expect(keyTarget('ArrowLeft', 0, 8)).toBe(0);
    expect(keyTarget('PageUp', 3, 8)).toBe(7);
    expect(keyTarget('PageDown', 3, 8)).toBe(0);
    expect(keyTarget('Home', 3, 8)).toBe(0);
    expect(keyTarget('End', 3, 8)).toBe(7);
    expect(keyTarget('a', 3, 8)).toBeNull();
  });

  it('un momento clave: la jugada hecha y la mejor', () => {
    const m = review.review.analysis.moves[5] as ReviewMoveDTO;
    expect(momentArrows(m)).toEqual([{ from: 'g8', to: 'f6', tone: 'played' }, { from: 'g7', to: 'g6', tone: 'hint' }]);
    expect(momentArrows({ ...m, best: null })).toHaveLength(1);
  });
});
