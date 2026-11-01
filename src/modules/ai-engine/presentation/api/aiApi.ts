import { apiFetch, toApiError } from '@/lib/apiClient';
import { AI_LEVELS, recommendedLevel, type AiLevelsResponse, type CreateAiGameInput, type Prediction } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import type { GameState } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { arenaMock, type ArenaMock } from '@/modules/arena/presentation/api/arenaApi';
import { livePosition, toMove } from '@/modules/arena/presentation/game/livePosition';

export type PredictionResult = { prediction: Prediction; etag: string } | 'not-modified';
export type CreateAiGame = Partial<CreateAiGameInput> & { level: number };

export const aiHttp = {
  levels: () => apiFetch<AiLevelsResponse>('/ai/levels', { cache: 'no-store' }),
  create: (input: CreateAiGame) =>
    apiFetch<{ state: GameState }>('/ai/games', { method: 'POST', body: JSON.stringify(input) }),                // 201
  async prediction(matchId: string, etag: string | null, signal?: AbortSignal): Promise<PredictionResult> {
    const res = await fetch(`/api/v1/matches/${matchId}/prediction`, {
      cache: 'no-store', credentials: 'same-origin', signal, headers: etag ? { 'If-None-Match': etag } : undefined,
    });
    if (res.status === 304) return 'not-modified';
    if (!res.ok) throw await toApiError(res);
    return { prediction: (await res.json()).prediction, etag: res.headers.get('ETag') ?? '' };
  },
  takeback: (matchId: string, ply: number) =>
    apiFetch<void>(`/matches/${matchId}/moves/last?ply=${ply}`, { method: 'DELETE' }),                            // 204
};

/** Mock con los mismos códigos que la API, sobre la partida en memoria del mock de la arena (siempre con blancas). */
export function createAiMock(arena: ArenaMock): typeof aiHttp {
  let mockId = 0;
  return {
    levels: async () => ({ levels: [...AI_LEVELS], recommended: recommendedLevel(1200), activeGame: null }),
    async create({ level, prediction = true }) {
      const id = `ai-mock-${++mockId}`, l = AI_LEVELS.find(x => x.level === level) ?? AI_LEVELS[0]!;
      arena.setAi(id, { level: l.level, name: l.name, prediction, takebacks: 0 });
      const r = await arena.state(id, 0, null);   // sin etag nunca da 304
      if (r === 'not-modified') throw new Error('mock');
      return { state: r.state };
    },
    async prediction(matchId, etag) {
      const { fen, ply, turn } = arena.position(matchId), tag = `"p-${ply}"`;
      if (etag === tag) return 'not-modified';
      const { predict } = await import('@/modules/ai-engine/domain/search');   // el motor no entra en el paquete de producción
      const { white, top, depth } = predict(fen, 300);
      const moves = turn === 'white' ? top.map(m => ({ ...m, san: livePosition(fen, null).move(toMove(m.uci)).san })) : [];
      return { prediction: { ply, white, top: moves, depth }, etag: tag };
    },
    takeback: (matchId, ply) => arena.takeback(matchId, ply),
  };
}

export const aiApi = process.env.NEXT_PUBLIC_API_MOCK === '1' ? createAiMock(arenaMock) : aiHttp;
