import { unstable_rethrow } from 'next/navigation';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError, TooManyRequestsError } from './AppError';
import { zodFields } from './zodFields';

export function toErrorResponse(e: unknown) {
  // deja pasar los errores internos de Next (p. ej. el que marca la ruta como dinámica en el build)
  unstable_rethrow(e);
  if (e instanceof ZodError)
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos',
      fields: zodFields(e) } }, { status: 400 });
  if (e instanceof AppError)
    return NextResponse.json({ error: { code: e.code, message: e.message, fields: e.fields, meta: e.meta } },
      { status: e.status, headers: e instanceof TooManyRequestsError ? { 'Retry-After': String(e.retryAfterS) } : undefined });
  console.error('[api] error no controlado', e);
  return NextResponse.json({ error: { code: 'INTERNAL', message: 'Error interno' } }, { status: 500 });
}
