import { describe, expect, it } from 'vitest';
import type { Square } from '@/components/chess/types';
import { pickSquare } from '../pickSquare';

const dest = (...sq: Square[]) => (s: Square) => sq.includes(s);

describe('pickSquare', () => {
  it('sin pieza seleccionada gana el primer cruce', () => {
    expect(pickSquare(['e7', 'e8'], null, dest())).toBe('e7');
  });

  it('el rayo cruza la pieza seleccionada hacia un destino: juega ese destino', () => {
    expect(pickSquare(['e7', 'e8'], 'e7', dest('e8'))).toBe('e8');
  });

  it('toca la pieza seleccionada y su casilla: sigue siendo ella', () => {
    expect(pickSquare(['e7', 'e7'], 'e7', dest('e8'))).toBe('e7');
  });

  it('detrás de la pieza seleccionada no hay destino: cuenta como tocarla', () => {
    expect(pickSquare(['e4', 'e5'], 'e4', dest('d5'))).toBe('e4');
  });

  it('otra pieza delante de la seleccionada gana', () => {
    expect(pickSquare(['d2', 'e4', 'e5'], 'e4', dest('e5'))).toBe('d2');
  });

  it('sin cruces no elige nada', () => {
    expect(pickSquare([], 'e4', dest('e5'))).toBeNull();
  });
});
