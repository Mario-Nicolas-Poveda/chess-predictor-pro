'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema } from '@/modules/auth/infrastructure/dto/authSchemas';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { authApi } from '../api/authApi';
import { applyApiError } from '@/lib/formErrors';
import { FormShell } from './FormShell';
import { PasswordInput } from './PasswordInput';

const OAUTH_ERROR = 'No se pudo entrar con Google. Intenta de nuevo o usa tu correo.';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm({ resolver: zodResolver(LoginSchema), mode: 'onBlur' });

  const onSubmit = handleSubmit(async values => {
    try {
      await authApi.login(values);
      const next = searchParams.get('next');
      router.replace(next?.startsWith('/dashboard') ? next : '/dashboard/profile');   // nunca a URLs externas
      router.refresh();
    } catch (e) {
      applyApiError(e, setError);
    }
  });

  const alert = errors.root?.message ?? (searchParams.get('error') === 'oauth' ? OAUTH_ERROR : undefined);

  return (
    <FormShell title="Entrar" alert={alert}
      footer={<>¿No tienes cuenta? <Link href="/register" className="text-wine underline-offset-4 hover:underline">Crear cuenta</Link></>}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Field label="Correo" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Contraseña" error={errors.password?.message}>
          <PasswordInput autoComplete="current-password" {...register('password')} />
        </Field>
        <Button type="submit" loading={isSubmitting} className="w-full">Entrar</Button>
      </form>
    </FormShell>
  );
}
