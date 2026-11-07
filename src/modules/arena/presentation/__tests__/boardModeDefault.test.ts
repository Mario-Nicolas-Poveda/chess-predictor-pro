import { afterEach, describe, expect, it, vi } from 'vitest';
import { phoneDefault2d } from '../hooks/useBoardMode';

const env = (touch: boolean, chose3d: string | null) => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: touch }) });
  vi.stubGlobal('localStorage', { getItem: () => chose3d });
};
afterEach(() => vi.unstubAllGlobals());

describe('modo del tablero por defecto (#171, opción A)', () => {
  it('celular sin elección propia → 2D', () => { env(true, null); expect(phoneDefault2d()).toBe(true); });
  it('celular que eligió 3D → se respeta', () => { env(true, '1'); expect(phoneDefault2d()).toBe(false); });
  it('escritorio → igual que antes (lo que diga la preferencia)', () => { env(false, null); expect(phoneDefault2d()).toBe(false); });
  it('sin localStorage (privado) → 2D en el celular, sin romper', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('bloqueado'); } });
    expect(phoneDefault2d()).toBe(true);
  });
});
