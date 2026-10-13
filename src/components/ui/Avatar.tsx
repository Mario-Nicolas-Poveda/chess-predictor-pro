'use client';

import { useState, type ReactNode } from 'react';

// Foto del usuario; si la URL no carga, muestra `fallback` (o nada).
export function Avatar({ src, size, fallback = null }: { src: string | null; size: number; fallback?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return fallback;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL externa del usuario, sin configurar dominios
    <img src={src} alt="" width={size} height={size} onError={() => setFailed(true)}
      className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  );
}
