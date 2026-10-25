'use client';

import { useState } from 'react';
import Image from 'next/image';

// solo estos dominios pasan por el optimizador (next.config.ts); una URL pegada a mano se muestra tal cual
const OPTIMIZABLE = /^https:\/\/([a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/avatars\/|lh3\.googleusercontent\.com\/)/;

type Props = { user: { username: string; avatarUrl: string | null }; size: number; className?: string };

/** Foto del usuario en un círculo; sin foto (o si no carga), su inicial. `className` da el color del círculo de la inicial. */
export function Avatar({ user, size, className = 'bg-ink text-paper' }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  const src = user.avatarUrl;
  if (!src || failed === src) return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full font-display leading-none ${className}`}
      style={{ width: size, height: size, fontSize: size / 2 }}>
      {user.username.charAt(0).toUpperCase()}
    </span>
  );
  // alt vacío: el nombre siempre va al lado
  return <Image src={src} alt="" width={size} height={size} sizes={`${size}px`} unoptimized={!OPTIMIZABLE.test(src)}
    onError={() => setFailed(src)} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
}
