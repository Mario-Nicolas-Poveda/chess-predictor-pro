'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema } from '@/modules/auth/infrastructure/dto/authSchemas';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { authApi } from '../api/authApi';
import { applyApiError } from './formErrors';
import { FormShell } from './FormShell';
import { PasswordInput } from './PasswordInput';

export function RegisterForm() {
  const router = useRouter();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm({ resolver: zodResolver(RegisterSchema), mode: 'onBlur' });

  const onSubmit = handleSubmit(async values => {
    try {
      await authApi.register(values);
      router.replace('/dashboard/profile');
      router.refresh();
    } catch (e) {
      applyApiError(e, setError);
    }
  });

  return (
    <FormShell title="Crear cuenta" alert={errors.root?.message}
      footer={<>¿Ya tienes cuenta? <Link href="/login" className="text-wine underline-offset-4 hover:underline">Entrar</Link></>}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Field label="Correo" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Usuario" hint="3–20: letras, números y _" error={errors.username?.message}>
          <Input autoComplete="username" {...register('username')} />
        </Field>
        <Field label="Contraseña" hint="Mínimo 8, con una letra y un número" error={errors.password?.message}>
          <PasswordInput autoComplete="new-password" {...register('password')} />
        </Field>
        <Button type="submit" loading={isSubmitting} className="w-full">Crear cuenta</Button>
      </form>
    </FormShell>
  );
}
