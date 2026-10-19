'use client';

import { useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
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
// La query se lee en el cliente: con useSearchParams el formulario salía del HTML estático y al llegar empujaba el pie (CLS 0,061 en móvil).
const noSubscribe = () => () => {};
const useQuery = () => new URLSearchParams(useSyncExternalStore(noSubscribe, () => location.search, () => ''));

export function LoginForm() {
  const router = useRouter();
  const searchParams = useQuery();
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
    <FormShell title="Entrar." lead="Tu ELO, tus partidas y el coach te esperan." alert={alert}
      aside={{ text: '¿Sin cuenta?', href: '/register', cta: 'Crear una' }}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Field label="Correo" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="tu@correo.com" {...register('email')} />
        </Field>
        <Field label="Contraseña" error={errors.password?.message}>
          <PasswordInput autoComplete="current-password" placeholder="Mínimo 8 caracteres" {...register('password')} />
        </Field>
        <Button type="submit" loading={isSubmitting} className="h-[52px]! w-full text-[17px]">Entrar</Button>
      </form>
    </FormShell>
  );
}
