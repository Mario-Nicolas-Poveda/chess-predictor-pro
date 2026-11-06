import { describe, expect, it } from 'vitest';
import type { GameState } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { canAbort, exitCopy, panelOpenFor } from '../game/arenaPanel';

describe('panel de la arena', () => {
  it('jugando manda lo guardado en el dispositivo', () => {
    expect(panelOpenFor(null, 'play', true)).toBe(true);
    expect(panelOpenFor(null, 'play', false)).toBe(false);
  });

  it('el botón gana a lo guardado, solo en su fase', () => {
    expect(panelOpenFor({ phase: 'play', open: false }, 'play', true)).toBe(false);
    expect(panelOpenFor({ phase: 'end', open: false }, 'end', true)).toBe(false);
  });

  it('al terminar se abre solo aunque estuviera oculto', () => {
    expect(panelOpenFor({ phase: 'play', open: false }, 'end', false)).toBe(true);
  });
});

describe('salir de la partida', () => {
  const base = { you: { elo: 1200 }, opponent: { elo: 1200, username: 'bea' }, ai: null } as unknown as GameState;

  it('sin empezar: cancelar', () => {
    expect(exitCopy({ ...base, status: 'pending' })).toMatchObject({ action: 'cancel', confirm: 'Salir y cancelar' });
  });

  it('contra una persona: rendirse y cuánto ELO se pierde', () => {
    const c = exitCopy({ ...base, status: 'active' });
    expect(c.action).toBe('resign');
    expect(c.text).toBe('Contará como derrota (−16 ELO) y bea gana la partida.');
  });

  it('contra la IA: rendirse sin tocar el ELO', () => {
    const c = exitCopy({ ...base, status: 'active', ply: 2, yourColor: 'white', ai: { level: 3, name: 'Alfil', prediction: true, takebacks: 0 } });
    expect(c).toMatchObject({ action: 'resign', text: 'La partida queda como derrota en tu historial. No cambia tu ELO.' });
  });
});

describe('salir sin registrar (contra la IA)', () => {
  const ai = { level: 3 as const, name: 'Alfil', prediction: true, takebacks: 0 };
  const at = (yourColor: 'white' | 'black', ply: number, extra: Partial<GameState> = {}) =>
    canAbort({ ai, status: 'active', yourColor, ply, ...extra } as GameState);

  it('blancas: solo en la jugada 0', () => {
    expect(at('white', 0)).toBe(true);
    expect(at('white', 1)).toBe(false);
  });
  it('negras: la IA ya abrió (ply 1), pero tú no', () => {
    expect(at('black', 1)).toBe(true);
    expect(at('black', 2)).toBe(false);
  });
  it('con ELO o terminada: no', () => {
    expect(at('white', 0, { ai: null })).toBe(false);
    expect(at('white', 0, { status: 'finished' })).toBe(false);
  });
  it('"Salir" ofrece salir sin registrar en vez de rendirse', () => {
    const base = { you: { elo: 1200 }, opponent: { elo: 1200, username: 'IA' } } as unknown as GameState;
    expect(exitCopy({ ...base, ai, status: 'pending', ply: 0, yourColor: 'white' })).toMatchObject({ action: 'abort', confirm: 'Salir sin registrar' });
  });
});
