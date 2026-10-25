import { describe, expect, it } from 'vitest';
import { arrowPath, pieceLabel, screenSquares } from '../Board2D';

describe('tablero 2D', () => {
  it('blancas abajo: la primera casilla en pantalla es a8; negras abajo: h1', () => {
    expect(screenSquares('white')[0]).toBe('a8');
    expect(screenSquares('white')[63]).toBe('h1');
    expect(screenSquares('black')[0]).toBe('h1');
  });

  it('nombres con el género correcto', () => {
    expect(pieceLabel('r', 'w')).toBe('torre blanca');
    expect(pieceLabel('q', 'b')).toBe('dama negra');
    expect(pieceLabel('k', 'b')).toBe('rey negro');
  });

  it('la punta de la flecha termina a 8 unidades del centro de la casilla de destino', () => {
    // e2 → e4 con blancas abajo: centros (450, 650) → (450, 450)
    const pts = arrowPath(450, 650, 450, 450).slice(1, -1).split('L').map(p => p.split(' ').map(Number));
    const tip = pts[3]!;
    expect(tip[0]).toBeCloseTo(450);
    expect(tip[1]).toBeCloseTo(458);
  });
});
