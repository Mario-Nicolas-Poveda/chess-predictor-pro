import { apiFetch, toApiError } from '@/lib/apiClient';
import { AI_LEVELS, recommendedLevel, type AiLevelsResponse, type CreateAiGameInput, type Prediction } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import type { GameState } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { arenaApi } from '@/modules/arena/presentation/api/arenaApi';

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

// shortcut: el mock solo cubre elegir nivel y crear (la partida corre en el mock de la arena con el bot local); predicción y deshacer van por http hasta la Fase 6.
let mockId = 0;
const mock: Pick<typeof aiHttp, 'levels' | 'create'> = {
  levels: async () => ({ levels: [...AI_LEVELS], recommended: recommendedLevel(1200), activeGame: null }),
  async create() {
    const r = await arenaApi.state(`ai-mock-${++mockId}`, 0, null);   // sin etag nunca da 304
    if (r === 'not-modified') throw new Error('mock');
    return { state: r.state };
  },
};

export const aiApi = process.env.NEXT_PUBLIC_API_MOCK === '1' ? { ...aiHttp, ...mock } : aiHttp;
