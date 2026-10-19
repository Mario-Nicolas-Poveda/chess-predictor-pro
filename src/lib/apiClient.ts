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
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<T>;
}

/** El error de la API ({ error: { code, message, fields, meta } }) como ApiError. */
export async function toApiError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => ({}));
  return new ApiError(res.status, body.error?.code ?? 'UNKNOWN',
    body.error?.message ?? 'Algo salió mal. Intenta de nuevo.', body.error?.fields, body.error?.meta);
}
