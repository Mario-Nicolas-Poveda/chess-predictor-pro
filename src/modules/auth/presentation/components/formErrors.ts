import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/lib/apiClient';

// 400/409 con `fields` → error en cada campo; el resto → mensaje arriba del formulario.
export function applyApiError<T extends FieldValues>(e: unknown, setError: UseFormSetError<T>) {
  if (e instanceof ApiError && e.fields && Object.keys(e.fields).length) {
    Object.entries(e.fields).forEach(([k, v]) => setError(k as Path<T>, { message: v[0] }));
  } else {
    setError('root', { message: e instanceof ApiError ? e.message : 'Sin conexión. Intenta de nuevo.' });
  }
}
