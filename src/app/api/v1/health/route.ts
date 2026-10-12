import { NextResponse, connection } from 'next/server';
import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';

export async function GET() {
  // Cache Components: sin esto Next intentaría prerenderizar y consultar la BD en el build
  await connection();
  const { error } = await supabaseAdmin.from('users').select('id', { head: true, count: 'exact' });
  return NextResponse.json({ status: 'ok', db: error ? 'down' : 'ok' }, { status: error ? 503 : 200 });
}
