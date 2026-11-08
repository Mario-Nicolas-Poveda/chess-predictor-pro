'use client';

import { useEffect, useId, useState } from 'react';
import { authApi } from '../api/authApi';
import { guestStartError, startGuest } from '../api/guestApi';
import { askAccount } from '../lib/accountRequired';
import { UpgradeDialog } from './UpgradeDialog';

export const GUEST_HOME = '/dashboard/ai';

/**
 * "Jugar sin cuenta": POST /auth/guest y navegación completa a Contra la IA (cookie y rol nuevos en toda la app).
 * El error queda debajo, en role="status" (siempre en el DOM: así se anuncia al aparecer).
 */
export function GuestStart({ className = '', statusClassName = '', children = 'Jugar sin cuenta' }:
  { className?: string; statusClassName?: string; children?: string }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const id = useId();

  const go = async () => {
    if (busy) return;
    setBusy(true); setProblem(null);
    try {
      await startGuest();                       // 201 nuevo · 200 ya tenías sesión
      window.location.assign(GUEST_HOME);
    } catch (e) {
      setBusy(false);
      setProblem(guestStartError(e));
    }
  };

  return (
    <>
      <button type="button" onClick={() => void go()} aria-disabled={busy || undefined} aria-describedby={problem ? id : undefined} className={className}>
        {busy ? 'Entrando…' : children}
      </button>
      <span id={id} role="status" className={statusClassName}>{problem}</span>
    </>
  );
}

/**
 * Login y registro con una sesión de invitado: entrar con otra cuenta borra al invitado. Aviso arriba del
 * formulario y el diálogo para convertirlo aquí mismo. Nada si no hay sesión o es un jugador.
 */
export function GuestSessionNotice() {
  const [guest, setGuest] = useState(false);
  useEffect(() => {
    const ctrl = new AbortController();
    authApi.me(ctrl.signal).then(r => { if (r.user.role === 'guest') setGuest(true); }).catch(() => {});
    return () => ctrl.abort();
  }, []);
  if (!guest) return null;
  return (
    <>
      <p className="border-l-2 border-accent pl-3 text-caption">
        Si entras con otra cuenta, se borran tus partidas de invitado. Para guardarlas,{' '}
        <button type="button" onClick={() => askAccount()} className="min-h-11 font-semibold underline underline-offset-4">crea tu cuenta desde aquí</button>.
      </p>
      <UpgradeDialog />
    </>
  );
}
