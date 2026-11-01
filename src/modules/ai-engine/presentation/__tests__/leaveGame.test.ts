import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/apiClient';
import { arenaApi } from '@/modules/arena/presentation/api/arenaApi';
import { leaveGame } from '../lib/leaveGame';

vi.mock('@/modules/arena/presentation/api/arenaApi', () => ({ arenaApi: { resign: vi.fn(), cancel: vi.fn() } }));
const resign = vi.mocked(arenaApi.resign), cancel = vi.mocked(arenaApi.cancel);

beforeEach(() => { vi.clearAllMocks(); cancel.mockResolvedValue(undefined); });

describe('leaveGame', () => {
  it('en juego se rinde y no cancela', async () => {
    resign.mockResolvedValue({ state: {} } as Awaited<ReturnType<typeof arenaApi.resign>>);
    await leaveGame('m');
    expect(cancel).not.toHaveBeenCalled();
  });

  it('sin jugadas (409 MATCH_NOT_ACTIVE) la cancela', async () => {
    resign.mockRejectedValue(new ApiError(409, 'MATCH_NOT_ACTIVE', 'Aún no empezó: cancélala'));
    await leaveGame('m');
    expect(cancel).toHaveBeenCalledWith('m');
  });

  it('otro error llega a quien llamó', async () => {
    const e = new ApiError(409, 'MATCH_FINISHED', 'La partida ya terminó');
    resign.mockRejectedValue(e);
    await expect(leaveGame('m')).rejects.toBe(e);
    expect(cancel).not.toHaveBeenCalled();
  });
});
