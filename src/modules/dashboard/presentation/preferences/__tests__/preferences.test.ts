import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/apiClient';
import { DEFAULT_PREFERENCES, type ProfilePreferences } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';
import { createSaver, type SaveStatus } from '../saver';
import { canHide, moveSection, toggleSection } from '../sections';

const P = DEFAULT_PREFERENCES;

describe('secciones', () => {
  it('mueve una sección arriba y abajo, sin salirse de los extremos', () => {
    expect(moveSection(P.sectionOrder, 'elo', -1)).toEqual(['elo', 'rend', 'forma', 'next']);
    expect(moveSection(P.sectionOrder, 'elo', 1)).toEqual(['rend', 'forma', 'elo', 'next']);
    expect(moveSection(P.sectionOrder, 'rend', -1)).toBe(P.sectionOrder);
    expect(moveSection(P.sectionOrder, 'next', 1)).toBe(P.sectionOrder);
  });

  it('no deja ocultar la última sección visible', () => {
    const three: ProfilePreferences = { ...P, hiddenSections: ['rend', 'elo', 'forma'] };
    expect(canHide(three, 'next')).toBe(false);
    expect(toggleSection(three, 'next')).toBe(three.hiddenSections);
    expect(toggleSection(three, 'elo')).toEqual(['rend', 'forma']);   // mostrar sí se puede
  });
});

describe('guardado de preferencias', () => {
  afterEach(() => { vi.useRealTimers(); });

  const setup = (save: (p: ProfilePreferences) => Promise<ProfilePreferences>) => {
    const statuses: SaveStatus[] = [];
    const hooks = { onSaved: vi.fn(), onRejected: vi.fn(), onUnauthorized: vi.fn() };
    const saveSpy = vi.fn(save);
    const saver = createSaver({ save: saveSpy, onStatus: s => statuses.push(s), ...hooks });
    return { saver, saveSpy, statuses, ...hooks };
  };

  it('tras 600 ms llama a save una sola vez, con el último cambio, aunque haya tres seguidos', async () => {
    vi.useFakeTimers();
    const { saver, saveSpy, onSaved } = setup(async p => p);
    saver.schedule({ ...P, theme: 'noche' });
    saver.schedule({ ...P, theme: 'salvia' });
    saver.schedule({ ...P, theme: 'pizarra' });
    await vi.advanceTimersByTimeAsync(599);
    expect(saveSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy.mock.calls[0]![0].theme).toBe('pizarra');
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ theme: 'pizarra' }));
  });

  it('con 400 avisa para volver al último guardado', async () => {
    const { saver, onRejected, onSaved } = setup(async () => { throw new ApiError(400, 'VALIDATION_ERROR', 'no'); });
    saver.schedule({ ...P, accent: 'bosque' });
    await saver.flush();
    expect(onRejected).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('con error de red queda en "error" y Reintentar envía lo mismo otra vez', async () => {
    let fail = true;
    const { saver, saveSpy, statuses } = setup(async p => { if (fail) throw new TypeError('fetch failed'); return p; });
    saver.schedule({ ...P, piece: 'n' });
    await saver.flush();
    expect(statuses.at(-1)).toBe('error');
    fail = false;
    await saver.flush();
    expect(statuses.at(-1)).toBe('saved');
    expect(saveSpy.mock.calls[1]![0].piece).toBe('n');
  });

  it('no envía preferencias que no cumplen el contrato', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { saver, saveSpy } = setup(async p => p);
    saver.schedule({ ...P, hiddenSections: ['rend', 'elo', 'forma', 'next'] });
    await saver.flush();
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
