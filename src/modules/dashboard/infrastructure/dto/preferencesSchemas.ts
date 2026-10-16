// Contrato compartido con el front: solo zod, sin imports de servidor
import { z } from 'zod';

export const THEMES = ['pergamino', 'noche', 'salvia', 'pizarra'] as const;
export const ACCENTS = ['vino', 'laton', 'bosque', 'oceano', 'tinta'] as const;
export const PROFILE_PIECES = ['k', 'q', 'r', 'b', 'n', 'p'] as const;          // rey, dama, torre, alfil, caballo, peón
export const PIECE_MATERIALS = ['w', 'b', 'a'] as const;                       // marfil, ébano, color del acento
export const HERO_LAYOUTS = ['clasico', 'invertido', 'pieza'] as const;        // nombre·pieza·ELO | ELO·pieza·nombre | pieza·nombre·ELO
export const SECTION_IDS = ['rend', 'elo', 'forma', 'next'] as const;          // Rendimiento, Evolución de Elo, Últimas partidas, Siguiente partida

const unique = <T>(a: readonly T[]) => new Set(a).size === a.length;

export const ProfilePreferencesSchema = z.object({
  theme: z.enum(THEMES),
  accent: z.enum(ACCENTS),
  piece: z.enum(PROFILE_PIECES),
  material: z.enum(PIECE_MATERIALS),
  heroLayout: z.enum(HERO_LAYOUTS),
  sectionOrder: z.array(z.enum(SECTION_IDS)).length(SECTION_IDS.length)
    .refine(unique, 'Cada sección debe aparecer una sola vez'),
  hiddenSections: z.array(z.enum(SECTION_IDS)).max(SECTION_IDS.length - 1, 'Deja al menos una sección visible')
    .refine(unique, 'Sección repetida'),
}).strict();

export type ProfilePreferences = z.infer<typeof ProfilePreferencesSchema>;

export const DEFAULT_PREFERENCES: ProfilePreferences = {
  theme: 'pergamino', accent: 'vino', piece: 'k', material: 'w', heroLayout: 'clasico',
  sectionOrder: ['rend', 'elo', 'forma', 'next'], hiddenSections: [],
};

// Lo guardado puede ser parcial o de una versión vieja: se completa con los valores por defecto y, si no valida, se usan estos
export function parsePreferences(stored: unknown): ProfilePreferences {
  const merged = ProfilePreferencesSchema.safeParse({ ...DEFAULT_PREFERENCES, ...(stored as Record<string, unknown>) });
  return merged.success ? merged.data : DEFAULT_PREFERENCES;
}
