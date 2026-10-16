// Copia temporal del contrato de preferencias (§14 de la guía). Se borra cuando entre
// `src/modules/dashboard/infrastructure/dto/preferencesSchemas.ts` de Mario.
import { z } from 'zod';

export const THEMES = ['pergamino', 'noche', 'salvia', 'pizarra'] as const;
export const ACCENTS = ['vino', 'laton', 'bosque', 'oceano', 'tinta'] as const;
export const PIECES = ['k', 'q', 'r', 'b', 'n', 'p'] as const;
export const MATERIALS = ['w', 'b', 'a'] as const;
export const HERO_LAYOUTS = ['clasico', 'invertido', 'pieza'] as const;
export const SECTION_IDS = ['rend', 'elo', 'forma', 'next'] as const;

export const ProfilePreferencesSchema = z.object({
  theme: z.enum(THEMES),
  accent: z.enum(ACCENTS),
  piece: z.enum(PIECES),
  material: z.enum(MATERIALS),
  heroLayout: z.enum(HERO_LAYOUTS),
  sectionOrder: z.array(z.enum(SECTION_IDS)).length(SECTION_IDS.length)
    .refine(a => new Set(a).size === a.length, 'Secciones repetidas'),
  hiddenSections: z.array(z.enum(SECTION_IDS)).max(SECTION_IDS.length - 1),
});
export type ProfilePreferences = z.infer<typeof ProfilePreferencesSchema>;

export const DEFAULT_PREFERENCES: ProfilePreferences = {
  theme: 'pergamino', accent: 'vino', piece: 'k', material: 'w', heroLayout: 'clasico',
  sectionOrder: ['rend', 'elo', 'forma', 'next'], hiddenSections: [],
};
