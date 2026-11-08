import { requireAccount } from '@/modules/auth/presentation/lib/accountRequired';
import { onUnauthorized } from '@/modules/auth/presentation/logout';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string,
              public fields?: Record<string, string[]>, public meta?: Record<string, unknown>) { super(message); }
}

// init.signal se pasa tal cual a fetch para poder cancelar.
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init, credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...init.headers },
  });
  if (res.status === 204) return undefined as T;
  // sesión vencida en una página con sesión: una sola salida completa (el login y las páginas públicas no)
  if (!res.ok) {
    const e = await toApiError(res);
    if (e.status === 401 && typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) onUnauthorized(e.code);
    throw e;
  }
  return res.json() as Promise<T>;
}

/** El error de la API ({ error: { code, message, fields, meta } }) como ApiError. */
export async function toApiError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => ({}));
  const e = new ApiError(res.status, body.error?.code ?? 'UNKNOWN',
    body.error?.message ?? 'Algo salió mal. Intenta de nuevo.', body.error?.fields, body.error?.meta);
  // por el code, no por el 403: "no es tu partida" también es 403. La pantalla recibe el error igual.
  if (e.code === 'ACCOUNT_REQUIRED') requireAccount({ message: e.message });
  return e;
}
