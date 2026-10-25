import { sourceRect, type Crop } from './crop';

/** Lo que cae dentro del círculo, a 512 × 512 en WebP (JPEG si el navegador no codifica WebP). */
export async function exportAvatar(img: CanvasImageSource, c: Crop, d = 280): Promise<Blob> {
  const { sx, sy, size } = sourceRect(c, d);
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const ctx = cv.getContext('2d')!; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, size, size, 0, 0, 512, 512);
  const blob = (type: string, q: number) => new Promise<Blob | null>(r => cv.toBlob(r, type, q));
  let out = await blob('image/webp', 0.9);
  if (!out || out.type !== 'image/webp') out = await blob('image/jpeg', 0.9);     // navegadores sin WebP al codificar
  if (!out) throw new Error('No se pudo preparar la foto');
  return out;
}
