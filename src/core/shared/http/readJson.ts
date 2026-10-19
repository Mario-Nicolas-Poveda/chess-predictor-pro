import type { ZodType } from 'zod';
import { UnsupportedMediaTypeError, ValidationError } from '../errors/AppError';
import '../zod'; // mensajes de zod en español

// Request y no NextRequest: acepta ambos y se prueba sin Next
export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const type = req.headers.get('content-type') ?? '';
  if (!type.toLowerCase().includes('application/json')) throw new UnsupportedMediaTypeError();
  let raw: unknown;
  try { raw = await req.json(); }
  catch { throw new ValidationError('El cuerpo no es un JSON válido', undefined, 'INVALID_JSON'); }
  return schema.parse(raw);     // ZodError → 400 en toErrorResponse
}
