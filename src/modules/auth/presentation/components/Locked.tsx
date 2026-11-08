'use client';

import type { ReactNode } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { canUse, type Feature, type Role } from '@/core/shared/auth/roles';
import { LOCKED_TEXT, askAccount } from '../lib/accountRequired';

export const LockIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

/**
 * Envuelve un botón o enlace: con permiso se ve igual; sin permiso es un botón con candado que abre
 * "Crea tu cuenta" (no se esconde: el invitado ve lo que gana al registrarse).
 * role null (la sesión aún no llega): se ve como jugador; si era invitado, el 403 del servidor abre el diálogo igual.
 */
export function Locked({ role, feature, label, className = '', children }:
  { role: Role | null; feature: Feature; label: string; className?: string; children: ReactNode }) {
  if (!role || canUse(role, feature)) return <>{children}</>;
  return (
    <button type="button" aria-label={`${label} · requiere cuenta`} onClick={() => askAccount(feature)}
      className={`inline-flex min-h-11 items-center gap-2 text-ink-soft hover:text-ink ${className}`}>
      {label} <LockIcon />
    </button>
  );
}

/** Una página solo para cuentas, abierta por la URL: el panel en lugar de la página (sin pedir nada a la API). */
export function LockedPanel({ feature }: { feature: Feature }) {
  return (
    <section aria-labelledby="locked-t" className="mx-auto flex max-w-[520px] flex-col items-center gap-4 px-4 py-20 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-band text-ink"><LockIcon size={24} /></span>
      <h1 id="locked-t" className="font-display text-[36px] leading-tight">Esto es para cuentas</h1>
      <p className="text-ink-soft">{LOCKED_TEXT[feature]} Tus partidas de invitado se quedan.</p>
      <button type="button" onClick={() => askAccount(feature)} className={buttonClass()}>Crear cuenta</button>
    </section>
  );
}

/** Barra fina arriba, solo para invitados. */
export function GuestBar({ expiresText }: { expiresText: string | null }) {
  return (
    <div role="region" aria-label="Sesión de invitado"
      className="flex items-center justify-between gap-3 bg-band px-4 py-1 text-caption lg:px-10">
      {/* en el celular, una línea: la fecha y "y guardar" quedan para el lector de pantalla */}
      <span className="min-w-0 whitespace-nowrap">
        Estás como invitado.<span className="max-sm:sr-only">{expiresText && ` ${expiresText}.`}</span>
      </span>
      <button type="button" onClick={() => askAccount()} className="min-h-11 shrink-0 whitespace-nowrap font-semibold underline underline-offset-4">
        Crear cuenta<span className="max-sm:sr-only"> y guardar</span>
      </button>
    </div>
  );
}

/** Contenido solo para jugadores: el panel si es invitado, nada mientras llega la sesión. */
export function PlayersOnly({ role, feature, children }: { role: Role | null; feature: Feature; children: ReactNode }) {
  if (!role) return null;   // sin esto la página de un invitado pediría a la API y abriría el diálogo con un 403
  return canUse(role, feature) ? <>{children}</> : <LockedPanel feature={feature} />;
}

/** En lugar del entrenador (resultado y repetición), para el invitado. */
export function CoachLocked() {
  return (
    <p className="max-w-[620px] text-ink-soft">
      ¿Quieres saber dónde fallaste?{' '}
      <button type="button" onClick={() => askAccount('coach')} className="inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-4">Crea tu cuenta</button>
      {' '}y el entrenador analiza tus partidas.
    </p>
  );
}
