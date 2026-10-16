import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/apiClient';
import { createMock } from '../api/matchmakingApi';
import { reducer, type PlayState } from '../hooks/useMatchmaking';

const searching = { state: 'searching', timeControl: '10+0', joinedAt: '', waitedSeconds: 0, elo: 1450,
  eloRange: { min: 1350, max: 1550 }, searchingNow: 1, pollAfterMs: 2000 } as const;

describe('reducer de Jugar', () => {
  it('solo se une a la cola desde el lobby', () => {
    expect(reducer({ phase: 'loading' }, { type: 'JOIN', timeControl: '3+2' })).toEqual({ phase: 'loading' });
    expect(reducer({ phase: 'lobby' }, { type: 'JOIN', timeControl: '3+2' })).toEqual({ phase: 'joining', timeControl: '3+2' });
  });

  it('un estado de polling que llega tarde no deshace el "cancelar"', () => {
    const leaving: PlayState = { phase: 'leaving', status: searching };
    expect(reducer(leaving, { type: 'SEARCHING', status: searching })).toBe(leaving);
  });
});

describe('mock de matchmaking', () => {
  it('responde como el contrato: 409 al repetir, 404 al salir sin estar', async () => {
    const api = createMock();
    expect((await api.join('5+0')).state).toBe('searching');
    await expect(api.join('5+0')).rejects.toMatchObject({ status: 409, code: 'ALREADY_IN_QUEUE' });
    await api.leave();
    const e = await api.leave().catch(err => err);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 404, code: 'NOT_IN_QUEUE' });
  });
});
