'use client';

import type { ReactNode } from 'react';
import type { Feature } from '@/core/shared/auth/roles';
import { useRole, useSession } from '@/modules/dashboard/presentation/hooks/useProfile';
import { guestExpiryText } from '../api/guestApi';
import { GuestBar, PlayersOnly } from './Locked';

/** La barra del invitado (arriba de la cabecera). Nada para un jugador o mientras llega la sesión. */
export function GuestBarSlot() {
  const s = useSession();
  if (s?.role !== 'guest') return null;
  return <GuestBar expiresText={s.guestExpiresAt ? guestExpiryText(s.guestExpiresAt) : null} />;
}

/** Una página solo para jugadores: el panel "Esto es para cuentas" si entra un invitado por la URL. */
export function RoleGate({ feature, children }: { feature: Feature; children: ReactNode }) {
  return <PlayersOnly role={useRole()} feature={feature}>{children}</PlayersOnly>;
}
