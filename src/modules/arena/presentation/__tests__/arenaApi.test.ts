import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/apiClient';
import type { GameState, MoveDTO } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { createMock } from '../api/arenaApi';
import { mergeMoves } from '../hooks/useGame';

const mv = (ply: number, uci: string): MoveDTO => ({ ply, uci, san: uci, whiteMs: 0, blackMs: 0, at: '' });

describe('mergeMoves', () => {
  it('suma por ply sin duplicar la última que repite el servidor y corta en el ply del estado', () => {
    const prev = [mv(1, 'e2e4'), mv(2, 'e7e5')];
    const state = { ply: 3, moves: [mv(2, 'e7e5'), mv(3, 'g1f3')] } as GameState;
    expect(mergeMoves(prev, state).map(m => m.uci)).toEqual(['e2e4', 'e7e5', 'g1f3']);
    expect(mergeMoves([...prev, mv(3, 'x'), mv(4, 'y')], { ply: 2, moves: [] as MoveDTO[] } as GameState)).toHaveLength(2);
  });
});

describe('mock de la arena', () => {
  const id = '00000000-0000-0000-0000-000000000001';
  const code = (p: Promise<unknown>) => p.then(() => 'ok', (e: ApiError) => `${e.status} ${e.code}`);

  it('ETag y not-modified, jugada 201 y errores 409 y 422 como la API', async () => {
    const api = createMock();
    const r = await api.state(id, 0, null);
    if (r === 'not-modified') throw new Error('primera carga sin estado');
    expect(r.state.status).toBe('pending');
    expect(await api.state(id, 0, r.etag)).toBe('not-modified');
    expect(await code(api.move(id, 'e2e5', 0))).toBe('422 ILLEGAL_MOVE');
    expect(await code(api.move(id, 'e2e4', 1))).toBe('409 STALE_PLY');
    const m = await api.move(id, 'e2e4', 0);
    expect(m.move).toMatchObject({ ply: 1, san: 'e4' });
    expect(m.state).toMatchObject({ status: 'active', turn: 'black', pollAfterMs: 1000 });
    expect(await code(api.move(id, 'd2d4', 1))).toBe('409 NOT_YOUR_TURN');
    expect(await code(api.cancel(id))).toBe('409 MATCH_NOT_PENDING');
    const end = await api.resign(id);
    expect(end.state.result).toMatchObject({ winner: 'black', reason: 'resign' });
    expect(end.state.result!.elo.white.after - end.state.result!.elo.white.before).toBe(-15);
    expect(end.state.pollAfterMs).toBe(0);
    expect(await code(api.move(id, 'd2d4', 1))).toBe('409 MATCH_FINISHED');
  });

  it('cancelar en pending deja la partida cancelada', async () => {
    const api = createMock();
    await api.cancel(id);
    const r = await api.state(id, 0, null);
    expect(r !== 'not-modified' && r.state.status).toBe('aborted');
  });
});

describe('dayLabel', () => {
  it('hoy, ayer y fecha corta', async () => {
    const { dayLabel } = await import('../reasons');
    const now = new Date(2026, 9, 18, 12).getTime();
    expect(dayLabel(new Date(2026, 9, 18, 1).toISOString(), now)).toBe('Hoy');
    expect(dayLabel(new Date(2026, 9, 17, 23).toISOString(), now)).toBe('Ayer');
    expect(dayLabel(new Date(2026, 9, 14, 9).toISOString(), now)).toBe('14 oct');
  });
});
