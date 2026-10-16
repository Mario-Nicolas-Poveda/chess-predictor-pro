import { clearSessionCookie } from '@/core/shared/auth/session';
import { noContent } from '@/core/shared/http/responses';

export async function POST() {
  const res = noContent();
  clearSessionCookie(res);
  return res;
}
