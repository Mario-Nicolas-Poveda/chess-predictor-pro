import { describe, expect, it } from 'vitest';
import { sniffImage } from '../sniffImage';

const bytes = (...b: (number | string)[]) =>
  new Uint8Array(b.flatMap(x => (typeof x === 'string' ? [...x].map(c => c.charCodeAt(0)) : [x])));

describe('sniffImage (tipo por los bytes)', () => {
  it('reconoce JPEG, PNG y WebP', () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(sniffImage(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe('image/png');
    expect(sniffImage(bytes('RIFF', 0x24, 0, 0, 0, 'WEBPVP8 '))).toBe('image/webp');
  });

  it('SVG, GIF, texto y archivos cortos → null', () => {
    expect(sniffImage(bytes('<svg xmlns="http://www.w3.org/2000/svg"><script>'))).toBeNull();
    expect(sniffImage(bytes('GIF89a'))).toBeNull();
    expect(sniffImage(bytes('hola'))).toBeNull();
    expect(sniffImage(bytes('RIFF', 0, 0, 0, 0, 'WAVE'))).toBeNull();
    expect(sniffImage(bytes(0xff, 0xd8))).toBeNull();
  });
});
