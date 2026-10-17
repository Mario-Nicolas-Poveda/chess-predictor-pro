import type { ACCENTS, PROFILE_PIECES, SECTION_IDS, THEMES } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';

export type ThemeId = (typeof THEMES)[number];
export type AccentId = (typeof ACCENTS)[number];
export type SectionId = (typeof SECTION_IDS)[number];
export type ProfilePiece = (typeof PROFILE_PIECES)[number];

export const THEME_LABEL: Record<ThemeId, string> = { pergamino: 'Pergamino', noche: 'Noche', salvia: 'Salvia', pizarra: 'Pizarra' };
export const ACCENT_LABEL: Record<AccentId, string> = { vino: 'Vino', laton: 'Latón', bosque: 'Bosque', oceano: 'Océano', tinta: 'Tinta' };
export const SECTION_LABEL: Record<SectionId, string> = { rend: 'Rendimiento', elo: 'Evolución de Elo', forma: 'Últimas partidas', next: 'Siguiente partida' };
export const PIECE_LABEL: Record<ProfilePiece, { name: string; glyph: string }> = {
  k: { name: 'Rey', glyph: '♔' }, q: { name: 'Dama', glyph: '♕' }, r: { name: 'Torre', glyph: '♖' },
  b: { name: 'Alfil', glyph: '♗' }, n: { name: 'Caballo', glyph: '♘' }, p: { name: 'Peón', glyph: '♙' },
};

/** Colores del acento: versión para temas claros y para el tema oscuro (mismo tono, contraste suficiente). */
export const ACCENT_HEX: Record<AccentId, { light: string; dark: string }> = {
  vino:   { light: '#6e1e2b', dark: '#d0697a' },
  laton:  { light: '#86561c', dark: '#d9a35c' },
  bosque: { light: '#2f5d46', dark: '#7fbf9c' },
  oceano: { light: '#244f7a', dark: '#86b2e0' },
  tinta:  { light: '#2a1417', dark: '#efe5d2' },
};

/** Colores que usa la escena 3D del perfil para el pedestal, según el tema. */
export const THEME_3D: Record<ThemeId, { tileL: string; tileD: string; frame: string; dark: boolean }> = {
  pergamino: { tileL: '#efe4d3', tileD: '#c9b08e', frame: '#4a2c24', dark: false },
  noche:     { tileL: '#d6bd91', tileD: '#5b3a24', frame: '#2c1b10', dark: true },
  salvia:    { tileL: '#e9eee2', tileD: '#9fb197', frame: '#2c3b30', dark: false },
  pizarra:   { tileL: '#e7ebf1', tileD: '#9aa6b8', frame: '#1f2937', dark: false },
};

export const accentHex = (theme: ThemeId, accent: AccentId) => (THEME_3D[theme].dark ? ACCENT_HEX[accent].dark : ACCENT_HEX[accent].light);

/** Muestra de color de cada tema en el panel (fondo, banda y texto). */
export const THEME_SWATCH: Record<ThemeId, [string, string, string]> = {
  pergamino: ['#f6efe3', '#eee4d4', '#2a1417'],
  noche:     ['#14100d', '#1e1813', '#efe5d2'],
  salvia:    ['#eef1e9', '#e1e7d9', '#1d2a21'],
  pizarra:   ['#edf0f4', '#e1e6ed', '#18212d'],
};
export const MATERIAL_LABEL = { w: 'Marfil', b: 'Ébano', a: 'Del acento' } as const;
export const HERO_LABEL = {
  clasico: { name: 'Clásico', hint: 'nombre · pieza · ELO' },
  invertido: { name: 'Invertido', hint: 'ELO · pieza · nombre' },
  pieza: { name: 'Pieza primero', hint: 'pieza · nombre · ELO' },
} as const;
