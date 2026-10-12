import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { AppError } from './AppError';

export function toErrorResponse(e: unknown) {
  if (e instanceof ZodError)
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos',
      fields: z.flattenError(e).fieldErrors } }, { status: 400 });
  if (e instanceof AppError)
    return NextResponse.json({ error: { code: e.code, message: e.message, fields: e.fields } }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: { code: 'INTERNAL', message: 'Error interno' } }, { status: 500 });
}
