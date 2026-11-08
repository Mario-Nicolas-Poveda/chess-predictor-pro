'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useForm, type UseFormSetError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/lib/apiClient';
import { applyApiError } from '@/lib/formErrors';
import type { RegisterInput } from '@/modules/auth/infrastructure/dto/authSchemas';
import { GuestUpgradeSchema } from '@/modules/auth/infrastructure/dto/sessionSchemas';
import { upgradeGuest } from '../api/guestApi';
import { DEFAULT_LOCKED, accountDialogClosed, onAccountRequired } from '../lib/accountRequired';
import { PasswordInput } from './PasswordInput';

const reload = () => window.location.reload();   // cookie y rol nuevos en toda la app

/** Qué hacer con un error de /auth/guest/upgrade. 'reload': ya es jugador (otra pestaña lo convirtió). */
export function upgradeError(e: unknown, setError: UseFormSetError<RegisterInput>): 'reload' | void {
  if (e instanceof ApiError && e.code === 'ALREADY_REGISTERED') return 'reload';
  if (e instanceof ApiError && e.status === 401) {
    setError('root', { message: 'Tu sesión de invitado terminó. Crea tu cuenta desde el inicio.' });
    return;
  }
  applyApiError(e, setError);   // 400/409 con fields → en su campo; el resto arriba
}

/**
 * "Crea tu cuenta": se abre con cualquier 403 ACCOUNT_REQUIRED o desde un candado. Convierte al invitado
 * en jugador SIN perder sus partidas. Al terminar, recarga la página entera (cookie nueva, rol nuevo).
 * <dialog> nativo: foco atrapado, Esc cierra, el foco vuelve a donde estaba.
 */
export function UpgradeDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [why, setWhy] = useState(DEFAULT_LOCKED);
  const id = useId();
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } =
    useForm<RegisterInput>({ resolver: zodResolver(GuestUpgradeSchema), mode: 'onBlur' });

  useEffect(() => onAccountRequired(r => {
    setWhy(r.message);
    reset();
    ref.current?.showModal();
  }), [reset]);

  const onSubmit = handleSubmit(async values => {
    try {
      await upgradeGuest(values);
      reload();
    } catch (e) {
      if (upgradeError(e, setError) === 'reload') reload();
    }
  });

  return (
    <dialog ref={ref} aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`} onClose={accountDialogClosed}
      className="m-auto w-[min(420px,calc(100vw-32px))] rounded-2xl border-0 bg-paper p-6 text-ink backdrop:bg-black/50">
      <h2 id={`${id}-t`} className="font-display text-[28px] leading-tight">Crea tu cuenta</h2>
      <p id={`${id}-d`} className="mt-1 text-[15px] text-ink-soft">{why} Tus partidas de invitado se quedan.</p>
      <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
        <Field label="Correo" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="tu@correo.com" {...register('email')} />
        </Field>
        <Field label="Usuario" error={errors.username?.message}>
          <Input autoComplete="username" {...register('username')} />
        </Field>
        <Field label="Contraseña" hint="8 o más, con una letra y un número" error={errors.password?.message}>
          <PasswordInput autoComplete="new-password" {...register('password')} />
        </Field>
        <p role="status" className="min-h-5 text-caption text-danger">{errors.root?.message}</p>
        {/* a 320 px no caben lado a lado: se apilan (el principal arriba) en vez de partir el texto */}
        <div className="flex flex-wrap-reverse gap-2">
          <Button variant="ghost" onClick={() => ref.current?.close()} className="flex-1 basis-32 whitespace-nowrap px-4">Ahora no</Button>
          <Button type="submit" loading={isSubmitting} className="flex-[1.4] basis-40 whitespace-nowrap px-4">{isSubmitting ? 'Creando…' : 'Crear cuenta'}</Button>
        </div>
      </form>
    </dialog>
  );
}
