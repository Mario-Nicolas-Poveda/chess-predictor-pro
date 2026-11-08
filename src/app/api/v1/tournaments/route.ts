import { withAuth } from '@/core/shared/auth/withAuth';
import { notModified } from '@/core/shared/http/etag';
import { ok } from '@/core/shared/http/responses';
import { listTournaments } from '@/modules/tournaments/presentation/controllers/container';

export const GET = withAuth(async (req, s) => {
  const r = await listTournaments.execute(s.userId, req.headers.get('if-none-match'));
  const headers = { ETag: r.etag, 'Cache-Control': 'private, no-cache' };
  if (r.notModified) return notModified(headers);
  // serverNow va fuera del ETag: sirve para las cuentas atrás del navegador
  return ok({ ...r.body, serverNow: new Date().toISOString() }, { headers });
}, { allow: 'any' });
