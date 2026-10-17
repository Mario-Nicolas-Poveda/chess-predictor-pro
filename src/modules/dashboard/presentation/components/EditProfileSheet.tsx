'use client';

import type { RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/apiClient';
import { applyApiError } from '@/lib/formErrors';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { usernameSchema } from '@/modules/auth/infrastructure/dto/authSchemas';
import type { Profile, UpdateProfileInput } from '@/modules/dashboard/infrastructure/dto/profileSchemas';
import { profileApi } from '../api/profileApi';

const COUNTRIES: [string, string][] = [
  ['CO', 'Colombia'], ['AR', 'Argentina'], ['CL', 'Chile'], ['EC', 'Ecuador'], ['ES', 'España'],
  ['US', 'Estados Unidos'], ['MX', 'México'], ['PE', 'Perú'], ['VE', 'Venezuela'],
];

// En el formulario todo es texto; '' se envía como null.
const FormSchema = z.object({
  displayName: z.string().trim().max(40, 'Máximo 40'),
  username: usernameSchema,
  country: z.string(),
  bio: z.string().trim().max(160, 'Máximo 160'),
  avatarUrl: z.string().trim().refine(v => v === '' || /^https:\/\/\S+$/.test(v), 'Debe ser una URL https'),
});
type FormValues = z.infer<typeof FormSchema>;

const toForm = (p: Profile): FormValues => ({
  displayName: p.displayName ?? '', username: p.username, country: p.country ?? '', bio: p.bio ?? '', avatarUrl: p.avatarUrl ?? '',
});

type Props = { ref: RefObject<HTMLDialogElement | null>; profile: Profile; onSaved: (p: Profile) => void };

export function EditProfileSheet({ ref, profile, onSaved }: Props) {
  const router = useRouter();
  const { register, handleSubmit, reset, setError, control, formState: { errors, isSubmitting, isDirty, dirtyFields } } =
    useForm({ resolver: zodResolver(FormSchema), defaultValues: toForm(profile) });
  const bio = useWatch({ control, name: 'bio' });

  // cerrar desde el propio elemento (no leer el ref en el render)
  const close = (e?: { target: unknown }) => (e?.target as Element | undefined)?.closest('dialog')?.close();
  const discard = (e: { target: unknown }) => { reset(); close(e); };

  const onSubmit = handleSubmit(async (values, e) => {
    const keys = (Object.keys(dirtyFields) as (keyof FormValues)[]).filter(k => dirtyFields[k]);
    const patch = Object.fromEntries(keys.map(k => [k, values[k] === '' ? null : values[k]])) as UpdateProfileInput;
    try {
      const r = await profileApi.update(patch);
      onSaved(r.profile);
      reset(toForm(r.profile));
      close(e);
      toast.success('Perfil actualizado');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) router.replace('/login?next=/dashboard/profile');
      else applyApiError(err, setError);
    }
  });

  return (
    <dialog ref={ref} aria-labelledby="edit-title" onClose={() => reset()}
      className="sheet">
      <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-rule px-6 py-5">
          <h2 id="edit-title" className="font-display text-3xl">Editar perfil</h2>
          <button type="button" onClick={close} aria-label="Cerrar" className="grid size-9 place-items-center rounded-md hover:bg-ink/5">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 divide-y divide-rule overflow-y-auto px-6 [&>*]:py-5">
          {errors.root && <p role="alert" className="text-sm text-danger">{errors.root.message}</p>}
          <Field label="Nombre visible" error={errors.displayName?.message}>
            <Input autoFocus autoComplete="name" {...register('displayName')} />
          </Field>
          <Field label="Usuario" hint="3–20: letras, números y _" error={errors.username?.message}>
            <Input autoComplete="off" spellCheck={false} {...register('username')} />
          </Field>
          <Field label="País" error={errors.country?.message}>
            <Select {...register('country')}>
              <option value="">Sin especificar</option>
              {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </Select>
          </Field>
          <Field label="Bio" hint={`${bio.length}/160`} error={errors.bio?.message}>
            <Textarea rows={3} {...register('bio')} />
          </Field>
          <Field label="URL de avatar" hint="https://…" error={errors.avatarUrl?.message}>
            <Input type="url" inputMode="url" {...register('avatarUrl')} />
          </Field>
        </div>
        <footer className="flex justify-end gap-3 border-t border-rule px-6 py-4">
          <Button variant="ghost" onClick={discard}>Descartar</Button>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Guardar cambios</Button>
        </footer>
      </form>
    </dialog>
  );
}
