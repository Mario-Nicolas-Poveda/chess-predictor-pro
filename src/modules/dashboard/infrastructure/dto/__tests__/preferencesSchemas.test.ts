import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, ProfilePreferencesSchema, parsePreferences } from '../preferencesSchemas';

const valid = (patch: object) => ProfilePreferencesSchema.safeParse({ ...DEFAULT_PREFERENCES, ...patch }).success;

describe('contrato de preferencias del perfil', () => {
  it('los valores por defecto son válidos', () => {
    expect(ProfilePreferencesSchema.parse(DEFAULT_PREFERENCES)).toEqual(DEFAULT_PREFERENCES);
  });

  it('rechaza secciones repetidas en el orden', () => {
    expect(valid({ sectionOrder: ['elo', 'elo', 'forma', 'next'] })).toBe(false);
  });

  it('no deja ocultar las 4 secciones', () => {
    expect(valid({ hiddenSections: ['rend', 'elo', 'forma'] })).toBe(true);
    expect(valid({ hiddenSections: ['rend', 'elo', 'forma', 'next'] })).toBe(false);
  });

  it('boardMode: sin mandarlo → 3d; 4d → error', () => {
    const old: Partial<typeof DEFAULT_PREFERENCES> = { ...DEFAULT_PREFERENCES };
    delete old.boardMode;
    expect(ProfilePreferencesSchema.parse(old).boardMode).toBe('3d');
    expect(valid({ boardMode: '2d' })).toBe(true);
    expect(valid({ boardMode: '4d' })).toBe(false);
  });

  it('rechaza un tema inexistente y campos extra', () => {
    expect(valid({ theme: 'neón' })).toBe(false);
    expect(valid({ fontSize: 20 })).toBe(false);
  });
});

describe('parsePreferences (lo guardado en la BD)', () => {
  it('sin nada guardado → valores por defecto', () => {
    expect(parsePreferences({})).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);   // columna aún sin migrar
  });

  it('guardado parcial → lo guardado más el resto por defecto', () => {
    expect(parsePreferences({ theme: 'noche' })).toEqual({ ...DEFAULT_PREFERENCES, theme: 'noche' });
  });

  it('guardado antes del Sprint 4 (sin boardMode) → 3d', () => {
    expect(parsePreferences({ theme: 'noche', accent: 'vino' }).boardMode).toBe('3d');
  });

  it('guardado inválido → valores por defecto', () => {
    expect(parsePreferences({ theme: 'neón' })).toEqual(DEFAULT_PREFERENCES);
  });
});
