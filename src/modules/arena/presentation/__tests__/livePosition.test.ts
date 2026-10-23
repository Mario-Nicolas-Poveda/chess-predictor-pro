import { describe, expect, it } from 'vitest';
import type { GameState } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { livePosition, sameBoard } from '../game/livePosition';
import { reducer } from '../hooks/useGame';

type Action = Parameters<typeof reducer>[1];

const FEN = '8/p5P1/1p2k3/2p5/8/8/PP3PPP/R5K1 w - - 0 1';

describe('livePosition', () => {
  it('coronar a torre: torre en g8, sin jaque y 12 jugadas de las negras', () => {
    const g = livePosition(FEN, 'g7g8r');
    expect(g.get('g8')).toEqual({ type: 'r', color: 'w' });
    expect(g.inCheck()).toBe(false);
    expect(g.moves()).toHaveLength(12);
  });

  it('coronar a dama: jaque y 6 jugadas', () => {
    const g = livePosition(FEN, 'g7g8q');
    expect(g.inCheck()).toBe(true);
    expect(g.moves()).toHaveLength(6);
  });

  it('sin letra de coronación lanza: no inventa dama', () => {
    expect(() => livePosition(FEN, 'g7g8')).toThrow();
  });

  it('sameBoard ignora los contadores y detecta otra pieza', () => {
    const rook = livePosition(FEN, 'g7g8r').fen();
    expect(sameBoard(rook, rook.replace(/ \d+ \d+$/, ' 7 40'))).toBe(true);
    expect(sameBoard(rook, livePosition(FEN, 'g7g8q').fen())).toBe(false);
  });
});

describe('reducer de la partida', () => {
  const after = livePosition(FEN, 'g7g8r').fen();
  const state = { fen: after, ply: 1, turn: 'black', yourColor: 'black', status: 'active' } as unknown as GameState;
  const init = { server: null, moves: [], etag: null, offset: 0, optimistic: null, notice: '', offline: false, error: null };
  const actions: Action[] = [{ type: 'OPTIMISTIC', uci: 'g7g8r' }, { type: 'STATE', state, moves: [], etag: null, offset: 0 }];

  it('optimista a torre + estado del servidor: destinos de negras sin jaque', () => {
    const s = actions.reduce(reducer, init);
    expect(s.optimistic).toBeNull();
    const g = livePosition(s.server!.fen, s.optimistic);
    expect(g.inCheck()).toBe(false);
    expect(g.moves()).toHaveLength(12);
  });

  it('ejecutado dos veces con la misma acción (Strict Mode) da lo mismo', () => {
    for (const a of actions) expect(reducer(reducer(init, a), a)).toEqual(reducer(init, a));
  });
});
