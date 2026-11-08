import { describe, expect, it } from 'vitest';
import { FEATURES, canUse, parseRole, type Feature } from '../roles';

describe('roles', () => {
  it('el invitado prueba la app contra la IA y mira, pero no juega con ELO ni gasta el entrenador', () => {
    for (const f of ['playAi', 'prediction', 'history', 'ranking', 'tournamentsView', 'preferences'] as Feature[])
      expect(canUse('guest', f), f).toBe(true);
    for (const f of ['playOnline', 'tournamentsJoin', 'coach', 'profileEdit'] as Feature[])
      expect(canUse('guest', f), f).toBe(false);
  });

  it('el jugador puede todo', () => {
    for (const f of Object.keys(FEATURES) as Feature[]) expect(canUse('player', f), f).toBe(true);
  });

  it('un rol ausente o desconocido es jugador (los tokens de antes); solo "guest" es invitado', () => {
    expect(parseRole(undefined)).toBe('player');
    expect(parseRole('admin')).toBe('player');
    expect(parseRole('guest')).toBe('guest');
  });
});
