'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { useLightDismiss } from '@/components/ui/useLightDismiss';

/** Confirmación de "Salir", bajo el botón. Esc o tocar fuera = "Seguir jugando"; el foco entra ahí. */
export function ExitDialog({ open, text, confirm, busy, onConfirm, onClose }: {
  open: boolean; text: string; confirm: string; busy: boolean; onConfirm: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const stay = useRef<HTMLButtonElement>(null);
  useLightDismiss(ref, onClose, !busy);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); stay.current?.focus(); }
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} aria-labelledby="exit-title" onClose={onClose}
      className="fixed inset-auto right-5 top-[68px] m-0 w-[min(360px,calc(100vw-40px))] rounded-[22px] bg-paper p-5 text-ink shadow-[0_18px_50px_-12px_rgb(0_0_0/.35),inset_0_0_0_1px_var(--t-rule)] backdrop:bg-transparent lg:right-[max(40px,calc((100vw-1320px)/2+40px))]">
      <h2 id="exit-title" className="font-display text-[28px] font-semibold leading-tight">¿Salir de la partida?</h2>
      <p className="mt-1.5 text-[15px] text-ink-soft">{text}</p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <Button ref={stay} variant="ghost" className="h-11! px-[18px]! text-sm" onClick={onClose}>Seguir jugando</Button>
        <Button className="h-11! px-[18px]! text-sm" loading={busy} onClick={onConfirm}>{confirm}</Button>
      </div>
    </dialog>
  );
}
