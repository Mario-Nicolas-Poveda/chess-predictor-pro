'use client';

import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { baseScale, moveBy, zoomTo, type Crop } from './crop';

export const D = 280;          // círculo de recorte en pantalla
const AREA = 320, PAD = (AREA - D) / 2;

/** La imagen colocada como en el recorte, escalada por `f` (1 = el círculo de 280). */
function Placed({ src, c, f }: { src: string; c: Crop; f: number }) {
  const s = baseScale(c, D) * c.zoom * f;
  // eslint-disable-next-line @next/next/no-img-element -- URL local (blob:) de la foto elegida
  return <img src={src} alt="" draggable={false} className="absolute max-w-none select-none"
    style={{ left: c.ox * f, top: c.oy * f, width: c.w * s, height: c.h * s }} />;
}

/** Vista previa redonda a `size` px con la misma cuenta. */
export function CropPreview({ src, crop, size }: { src: string; crop: Crop; size: number }) {
  return <span className="relative block shrink-0 overflow-hidden rounded-full bg-band" style={{ width: size, height: size }}><Placed src={src} c={crop} f={size / D} /></span>;
}

/** Área de 320 × 320 con el círculo de 280: arrastrar mueve, el control de zoom amplía; flechas y +/− con teclado. */
export function CropArea({ src, crop, onChange }: { src: string; crop: Crop; onChange: (c: Crop) => void }) {
  const last = useRef<{ x: number; y: number } | null>(null);
  const zoom = (z: number) => onChange(zoomTo(crop, Math.min(3, Math.max(1, z)), D));

  const down = (e: PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); last.current = { x: e.clientX, y: e.clientY }; };
  const move = (e: PointerEvent) => {
    if (!last.current) return;
    onChange(moveBy(crop, e.clientX - last.current.x, e.clientY - last.current.y, D));
    last.current = { x: e.clientX, y: e.clientY };
  };
  const up = () => { last.current = null; };
  const key = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 30 : 10;
    const d = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (d) { e.preventDefault(); onChange(moveBy(crop, d[0]!, d[1]!, D)); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoom(crop.zoom + 0.1); }
    else if (e.key === '-' || e.key === '−') { e.preventDefault(); zoom(crop.zoom - 0.1); }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div role="group" tabIndex={0} aria-label="Recorte de la foto. Arrastra o usa las flechas para moverla; + y − cambian el zoom."
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}
        className="relative shrink-0 cursor-grab touch-none overflow-hidden rounded-2xl bg-ink active:cursor-grabbing focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
        style={{ width: AREA, height: AREA }}>
        <div className="absolute" style={{ left: PAD, top: PAD, width: D, height: D }}><Placed src={src} c={crop} f={1} /></div>
        <span aria-hidden="true" className="pointer-events-none absolute rounded-full border-2 border-[#f6efe2] shadow-[0_0_0_400px_rgb(20_12_10/.58)]"
          style={{ left: PAD, top: PAD, width: D, height: D }} />
      </div>
      <label className="flex w-full max-w-[320px] items-center gap-3 text-sm text-ink-soft">
        Zoom
        <input type="range" min="1" max="3" step="0.01" value={crop.zoom} onChange={e => zoom(Number(e.target.value))} className="flex-1 accent-accent" />
      </label>
    </div>
  );
}
