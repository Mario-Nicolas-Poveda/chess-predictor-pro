import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, ProfilePreferencesSchema } from '../preferencesSchemas';

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

  it('rechaza un tema inexistente y campos extra', () => {
    expect(valid({ theme: 'neón' })).toBe(false);
    expect(valid({ fontSize: 20 })).toBe(false);
  });
});
