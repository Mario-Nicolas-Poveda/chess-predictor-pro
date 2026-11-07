import { describe, expect, it } from 'vitest';
import type { GameState } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { fromInitial } from '../hooks/useGame';

const state = {
  ply: 2, moves: [{ ply: 2, uci: 'b8c6', san: 'Nc6' }, { ply: 1, uci: 'e2e4', san: 'e4' }],
  clock: { serverNow: '2026-11-06T12:00:00.000Z' },
} as unknown as GameState;

describe('la arena arranca con el estado del HTML (#171)', () => {
  it('sin estado inicial: vacía, como antes', () => {
    expect(fromInitial()).toMatchObject({ server: null, moves: [], etag: null });
  });

  it('con estado inicial: jugadas en orden y su ETag para la primera consulta (304)', () => {
    const s = fromInitial({ state, etag: '"m-2"' });
    expect(s.server).toBe(state);
    expect(s.moves.map(m => m.ply)).toEqual([1, 2]);
    expect(s.etag).toBe('"m-2"');
    expect(s.offset).toBe(0);   // el desfase se mide al hidratar, no en el render
  });
});
