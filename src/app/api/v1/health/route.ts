import { connection } from 'next/server';
import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';
import { ServiceUnavailableError } from '@/core/shared/errors/AppError';
import { toErrorResponse } from '@/core/shared/errors/toErrorResponse';
import { ok } from '@/core/shared/http/responses';

export async function GET() {
  // Cache Components: sin esto Next intentaría prerenderizar y consultar la BD en el build
  await connection();
  const { error } = await supabaseAdmin.from('users').select('id', { head: true, count: 'exact' });
  if (error) return toErrorResponse(new ServiceUnavailableError('La base de datos no responde'));
  return ok({ status: 'ok', db: 'ok' });
}
