/** Imagen de ejemplo para probar el recorte en la demo: degradado acento → latón, cuadrícula suave y un caballo. No es la foto de nadie. */
export async function sampleImage(accent: string): Promise<File> {
  const cv = document.createElement('canvas'); cv.width = 960; cv.height = 720;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 960, 720);
  g.addColorStop(0, accent); g.addColorStop(1, '#b08d57');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 720);
  ctx.strokeStyle = 'rgb(255 250 240 / .12)'; ctx.lineWidth = 2;
  for (let x = 0; x <= 960; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 720); ctx.stroke(); }
  for (let y = 0; y <= 720; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke(); }
  ctx.fillStyle = '#f6efe2'; ctx.font = '440px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('♞︎', 480, 380);
  const blob = await new Promise<Blob | null>(r => cv.toBlob(r, 'image/jpeg', 0.9));
  if (!blob) throw new Error('No se pudo crear la imagen de ejemplo');
  return new File([blob], 'ejemplo.jpg', { type: 'image/jpeg' });
}
