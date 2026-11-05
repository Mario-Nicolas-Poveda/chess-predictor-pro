import { clearSessionCookie } from '@/core/shared/auth/session';
import { noContent } from '@/core/shared/http/responses';

// sin withAuth: 204 siempre, también sin sesión o con la cookie vencida
export async function POST() {
  const res = noContent();
  res.headers.set('Cache-Control', 'no-store');
  clearSessionCookie(res);
  return res;
}
