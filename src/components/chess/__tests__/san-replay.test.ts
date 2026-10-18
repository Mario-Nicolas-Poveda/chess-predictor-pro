import { describe, expect, it } from 'vitest';
import { framesOf } from '../replay';
import { normSan, sanEs } from '../san';

describe('notación en español', () => {
  it('traduce las piezas y la coronación, sin tocar enroques ni peones', () => {
    expect(sanEs('Nbd7')).toBe('Cbd7');
    expect(sanEs('bxc8=Q+')).toBe('bxc8=D+');
    expect(sanEs('O-O-O')).toBe('O-O-O');
  });
  it('normaliza lo que escribe el usuario', () => {
    expect(normSan('Nf3')).toBe(normSan('Cf3'));
    expect(normSan('0-0')).toBe(normSan('O-O'));
    expect(normSan('e8=Q')).toBe(normSan('e8=D'));
  });
});

describe('fotos por jugada', () => {
  it('el mate del pastor da 8 fotos con la captura, el jaque y la SAN', () => {
    const f = framesOf(['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7']);
    expect(f).toHaveLength(8);
    const last = f[7]!;
    expect(last.captured.black).toEqual(['bp6']);
    expect(last.check).toBe('e8');
    expect(last.san).toBe('Qxf7#');
  });
  it('el enroque mueve la torre sin cambiarle el id', () => {
    const f = framesOf(['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'e1g1']);
    const rook = f[0]!.pieces.find(p => p.square === 'h1')!;
    expect(f[7]!.pieces.find(p => p.id === rook.id)?.square).toBe('f1');
  });
});
