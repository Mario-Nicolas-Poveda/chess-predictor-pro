import { describe, expect, it } from 'vitest';
import type { GameState } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { exitCopy, panelOpenFor } from '../game/arenaPanel';

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
    const c = exitCopy({ ...base, status: 'active', ai: { level: 3, name: 'Alfil', prediction: true, takebacks: 0 } });
    expect(c).toMatchObject({ action: 'resign', text: 'La partida queda como derrota en tu historial. No cambia tu ELO.' });
  });
});
