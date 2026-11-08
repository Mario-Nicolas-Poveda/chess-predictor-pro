'use client';

import { useId, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { askAccount } from '@/modules/auth/presentation/lib/accountRequired';
import { logout } from '@/modules/auth/presentation/logout';
import { useProfile } from '@/modules/dashboard/presentation/hooks/useProfile';

export function UserBlock({ className = '' }: { className?: string }) {
  const { profile, role } = useProfile();
  const [leaving, setLeaving] = useState(false);   // la salida es una navegación completa: la página no vuelve con este estado
  const confirm = useRef<HTMLDialogElement>(null);
  const tid = useId();   // está dos veces (cabecera y menú del celular)
  if (!profile) return null;
  const guest = role === 'guest';

  // el invitado sale a la landing: su cuenta se borra con sus partidas
  const leave = () => { confirm.current?.close(); setLeaving(true); void logout(undefined, guest ? '/' : '/login'); };

  return (
    <div className={`items-center gap-3 ${className}`}>
      <Avatar user={profile} size={40} />
      <div className="leading-tight">
        <p className="text-sm font-medium text-ink">{guest ? 'Invitado' : profile.username}</p>
        <button type="button" onClick={guest ? () => confirm.current?.showModal() : leave} disabled={leaving}
          className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink disabled:opacity-60">
          {leaving ? 'Saliendo…' : 'Cerrar sesión'}
        </button>
      </div>
      {guest && (
        <dialog ref={confirm} aria-labelledby={tid}
          className="m-auto w-[min(420px,calc(100vw-32px))] rounded-2xl border-0 bg-paper p-6 text-ink backdrop:bg-black/50">
          <h2 id={tid} className="font-display text-[26px] leading-tight">¿Salir y borrar?</h2>
          <p className="mt-2 text-ink-soft">Si sales, se borran tus partidas de invitado. ¿Crear cuenta para guardarlas?</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button className="flex-1 basis-36 whitespace-nowrap px-4" onClick={() => { confirm.current?.close(); askAccount(); }}>Crear cuenta</Button>
            <Button variant="ghost" className="flex-1 basis-36 whitespace-nowrap px-4" onClick={leave}>Salir y borrar</Button>
          </div>
        </dialog>
      )}
    </div>
  );
}
