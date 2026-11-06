import { apiFetch, toApiError } from '@/lib/apiClient';
import type { Polled } from '@/lib/etagPoller';
import type {
  RegistrationDTO, TournamentDetail, TournamentListResponse, TournamentSummary,
} from '@/modules/tournaments/infrastructure/dto/tournamentSchemas';

/** Lo que llega con 200: el cuerpo y la hora del servidor (para las cuentas atrás). */
export type WithNow<T> = Polled<T> & { serverNow?: string };

async function getWithEtag<T>(url: string, key: string | null, etag: string | null, signal?: AbortSignal): Promise<WithNow<T>> {
  const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin', signal, headers: etag ? { 'If-None-Match': etag } : undefined });
  if (res.status === 304) return { kind: 'not-modified' };
  if (!res.ok) throw await toApiError(res);
  const body = await res.json();
  return { kind: 'data', data: (key ? body[key] : body) as T, etag: res.headers.get('ETag'), serverNow: body.serverNow };
}

export const tournamentsHttp = {
  list: (etag: string | null, signal?: AbortSignal) =>
    getWithEtag<TournamentListResponse>('/api/v1/tournaments', null, etag, signal),                       // 200 · 304
  detail: (id: string, etag: string | null, signal?: AbortSignal) =>
    getWithEtag<TournamentDetail>(`/api/v1/tournaments/${id}`, 'tournament', etag, signal),               // 200 · 304 · 404
  /** 201 (nueva) · 200 (ya estabas) · 403 · 404 · 409 TOURNAMENT_FULL / TOURNAMENT_CLOSED · 429 */
  join: async (id: string): Promise<{ created: boolean; tournament: TournamentSummary }> => {
    const res = await fetch(`/api/v1/tournaments/${id}/registration`, { method: 'POST', cache: 'no-store', credentials: 'same-origin' });
    if (!res.ok) throw await toApiError(res);
    return { created: res.status === 201, tournament: (await res.json()).tournament };
  },
  /** 204 · 404 NOT_REGISTERED · 409 TOURNAMENT_CLOSED */
  leave: (id: string) => apiFetch<void>(`/tournaments/${id}/registration`, { method: 'DELETE' }),
  registration: (id: string) => apiFetch<{ registration: RegistrationDTO }>(`/tournaments/${id}/registration`),
};

// import diferido: en producción no se descargan los fixtures de los mocks
const mock = () => import('./tournamentsMock').then(m => m.tournamentsMock);
const tournamentsMocked: typeof tournamentsHttp = {
  list: async etag => (await mock()).list(etag),
  detail: async (id, etag) => (await mock()).detail(id, etag),
  join: async id => (await mock()).join(id),
  leave: async id => (await mock()).leave(id),
  registration: async id => (await mock()).registration(id),
};

export const tournamentsApi = process.env.NEXT_PUBLIC_API_MOCK === '1' ? tournamentsMocked : tournamentsHttp;
