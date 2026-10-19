import { afterEach, describe, expect, it, vi } from 'vitest';
import { contextQuality } from '../quality';
import { SceneAborted, checkAbort } from '../yield';

describe('ceder el hilo', () => {
  it('checkAbort lanza SceneAborted con una señal abortada', () => {
    const c = new AbortController();
    expect(() => checkAbort(c.signal)).not.toThrow();
    c.abort();
    expect(() => checkAbort(c.signal)).toThrow(SceneAborted);
  });
});

describe('calidad del contexto', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  const strongDevice = () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 8, deviceMemory: 8 });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  };
  const fakeGl = (renderer: string) => ({
    RENDERER: 0x1f01,
    getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 0x9246 }),
    getParameter: () => renderer,
  }) as unknown as WebGLRenderingContext;

  it('WebGL por software cuenta como baja aunque el equipo sea potente', () => {
    strongDevice();
    expect(contextQuality(fakeGl('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))'))).toBe('low');
    expect(contextQuality(fakeGl('Google SwiftShader'))).toBe('low');
  });

  it('una GPU real en un equipo potente es alta', () => {
    strongDevice();
    expect(contextQuality(fakeGl('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)'))).toBe('high');
  });
});
