export type ImageType = 'image/jpeg' | 'image/png' | 'image/webp';

// tipo real por los primeros bytes ("números mágicos"): no confía en el nombre ni en el content-type del navegador
export function sniffImage(b: Uint8Array): ImageType | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return 'image/png';
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;   // svg (puede llevar scripts), gif, heic, pdf, exe renombrado… → 415
}
