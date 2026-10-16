import { ApiError, apiFetch } from '@/lib/apiClient';
import type { MatchmakingStatus, MatchSummary, QueueStats, TimeControl } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';

export interface MatchmakingApi {
  join(timeControl: TimeControl): Promise<MatchmakingStatus>;
  leave(): Promise<void>;
  status(signal?: AbortSignal): Promise<MatchmakingStatus>;
  stats(): Promise<QueueStats>;
  match(id: string, signal?: AbortSignal): Promise<{ match: MatchSummary }>;
  abort(id: string): Promise<void>;
}

const http: MatchmakingApi = {
  join: tc => apiFetch('/matchmaking/queue', { method: 'POST', body: JSON.stringify({ timeControl: tc }) }),
  leave: () => apiFetch('/matchmaking/queue', { method: 'DELETE' }),
  status: signal => apiFetch('/matchmaking/status', { signal, cache: 'no-store' }),
  stats: () => apiFetch('/matchmaking/stats', { cache: 'no-store' }),
  match: (id, signal) => apiFetch(`/matches/${encodeURIComponent(id)}`, { signal, cache: 'no-store' }),
  abort: id => apiFetch(`/matches/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/** Mock en memoria con la misma interfaz (NEXT_PUBLIC_API_MOCK=1): empareja a los 9 s contra bob_gambito. */
export function createMock(): MatchmakingApi {
  const ELO = 1450;
  let joinedAt: number | null = null;
  let tc: TimeControl = '10+0';
  let match: MatchSummary | null = null;
  const delay = () => new Promise(r => setTimeout(r, 200));
  const player = (username: string, elo: number) => ({ id: crypto.randomUUID(), username, displayName: null, avatarUrl: null, elo });

  return {
    async join(t) {
      await delay();
      if (match?.status === 'pending') throw new ApiError(409, 'ACTIVE_MATCH_EXISTS', 'Ya tienes una partida', undefined, { matchId: match.id });
      if (joinedAt !== null) throw new ApiError(409, 'ALREADY_IN_QUEUE', 'Ya estás en la cola');
      joinedAt = Date.now(); tc = t;
      return this.status();
    },
    async leave() {
      await delay();
      if (joinedAt === null) throw new ApiError(404, 'NOT_IN_QUEUE', 'No estás en la cola');
      joinedAt = null;
    },
    async status() {
      await delay();
      if (match?.status === 'pending') return { state: 'matched', match };
      if (joinedAt === null) return { state: 'idle' };
      const secs = Math.floor((Date.now() - joinedAt) / 1000);
      if (secs >= 9) {
        match = { id: crypto.randomUUID(), timeControl: tc, status: 'pending', createdAt: new Date().toISOString(), yourColor: 'white',
          you: player('alice', ELO), opponent: player('bob_gambito', 1478) };
        joinedAt = null;
        return { state: 'matched', match };
      }
      // el servidor amplía +50 cada 10 s; el mock cada 2 s para ver crecer la banda
      const half = Math.min(400, 100 + 50 * Math.floor(secs / 2));
      return { state: 'searching', timeControl: tc, joinedAt: new Date(joinedAt).toISOString(), waitedSeconds: secs,
        elo: ELO, eloRange: { min: ELO - half, max: ELO + half }, searchingNow: 12, pollAfterMs: 1000 };
    },
    async stats() {
      await delay();
      return { searching: { '3+2': 4, '5+0': 2, '10+0': 6 }, total: 12 };
    },
    async match(id) {
      await delay();
      if (match?.id !== id) throw new ApiError(404, 'MATCH_NOT_FOUND', 'La partida no existe');
      return { match };
    },
    async abort(id) {
      await delay();
      if (match?.id !== id) throw new ApiError(404, 'MATCH_NOT_FOUND', 'La partida no existe');
      if (match.status !== 'pending') throw new ApiError(409, 'MATCH_NOT_PENDING', 'La partida ya no está pendiente');
      match = { ...match, status: 'aborted' };
    },
  };
}

export const matchmakingApi: MatchmakingApi = process.env.NEXT_PUBLIC_API_MOCK === '1' ? createMock() : http;
