import { ApiError, toApiError } from '@/lib/apiClient';
import type { RegisterInput } from '@/modules/auth/infrastructure/dto/authSchemas';
import type { SessionUser } from '@/modules/auth/infrastructure/dto/sessionSchemas';

/**
 * POST /auth/guest → 201 (invitado nuevo, cookie puesta) · 200 (ya tenías sesión: no crea otro)
 * · 429 (demasiados invitados desde tu red) · 503 GUEST_CAPACITY.
 */
async function startGuestHttp(): Promise<{ created: boolean; user: SessionUser }> {
  const res = await fetch('/api/v1/auth/guest', { method: 'POST', credentials: 'same-origin', cache: 'no-store' });
  if (!res.ok) throw await toApiError(res);
  return { created: res.status === 201, user: (await res.json()).user };
}

/**
 * POST /auth/guest/upgrade → 200 con la cookie nueva (rol jugador) · 400 (fields) · 409 EMAIL_TAKEN /
 * USERNAME_TAKEN (fields) · 409 ALREADY_REGISTERED · 401 SESSION_EXPIRED.
 */
async function upgradeGuestHttp(input: RegisterInput): Promise<SessionUser> {
  const res = await fetch('/api/v1/auth/guest/upgrade', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()).user;
}

// Mock (NEXT_PUBLIC_API_MOCK=1), escenario en localStorage 'cpp:mock-guest': ok · limited · full · taken
const scenario = () => { try { return localStorage.getItem('cpp:mock-guest') ?? 'ok'; } catch { return 'ok'; } };
const wait = () => new Promise(r => setTimeout(r, 400));
const mockUser = (role: SessionUser['role']): SessionUser => ({
  id: 'guest-mock', email: role === 'guest' ? null : 'tu@correo.com', username: 'invitado_e77213', displayName: role === 'guest' ? 'Invitado' : null,
  avatarUrl: null, elo: 1200, role, guestExpiresAt: role === 'guest' ? new Date(Date.now() + 7 * 86_400_000).toISOString() : null,
});
export const guestMock = {
  async start() {
    await wait();
    const s = scenario();
    if (s === 'limited') throw new ApiError(429, 'RATE_LIMITED', 'Demasiadas solicitudes', undefined, { retryAfterS: 1800 });
    if (s === 'full') throw new ApiError(503, 'GUEST_CAPACITY', 'Sin cupo para invitados', undefined, { retryAfterS: 600 });
    return { created: true, user: mockUser('guest') };
  },
  async upgrade(_input: RegisterInput) {
    await wait();
    if (scenario() === 'taken') throw new ApiError(409, 'EMAIL_TAKEN', 'Ese correo ya tiene cuenta', { email: ['Ese correo ya tiene cuenta'] });
    return mockUser('player');
  },
};

const MOCK = process.env.NEXT_PUBLIC_API_MOCK === '1';
export const startGuest = MOCK ? guestMock.start : startGuestHttp;
export const upgradeGuest = MOCK ? guestMock.upgrade : upgradeGuestHttp;

/** Texto para el error de "Jugar sin cuenta". */
export function guestStartError(e: unknown): string {
  if (e instanceof ApiError && e.status === 429) {
    const min = Math.max(1, Math.ceil(Number(e.meta?.retryAfterS ?? 600) / 60));
    return `Se crearon muchos invitados desde tu red. Prueba en ${min} min o crea tu cuenta.`;
  }
  if (e instanceof ApiError && e.code === 'GUEST_CAPACITY') return 'Ahora no hay cupo para invitados. Crea tu cuenta: es gratis.';
  if (e instanceof ApiError) return 'No se pudo entrar como invitado. Intenta de nuevo.';
  return 'Sin conexión. Reintenta en un momento.';
}

/** "Tu partida de invitado se borra el sáb 14 nov" (hora de Bogotá). */
export function guestExpiryText(iso: string): string {
  const parts = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Bogota' })
    .formatToParts(new Date(iso));
  const get = (t: string) => parts.find(p => p.type === t)?.value.replace(/\./g, '') ?? '';
  return `Tu partida de invitado se borra el ${get('weekday')} ${get('day')} ${get('month')}`;   // sáb 14 nov
}
