/**
 * Roles y qué puede usar cada uno. Sin imports de servidor: lo usan las rutas y también el navegador
 * (para mostrar candados). El servidor decide igual: esto en el navegador es solo para la interfaz.
 */
export const ROLES = ['player', 'guest'] as const;
export type Role = (typeof ROLES)[number];

/** Quién entra a una ruta. Por defecto 'player': una ruta nueva queda cerrada a los invitados. */
export type RouteAccess = 'player' | 'any';

/** El invitado vive 7 días (igual que el JWT y la cookie); después se borra con todo lo suyo. */
export const GUEST_TTL_S = 7 * 86_400;
/** Tope de invitados a la vez (protege la BD del plan gratis). */
export const GUESTS_MAX = 1000;

/** Un token viejo, sin el claim `role`, es de un jugador (todos los tokens antes de este cambio). */
export const parseRole = (v: unknown): Role => (v === 'guest' ? 'guest' : 'player');

export const canAccess = (access: RouteAccess, role: Role): boolean => access === 'any' || role === 'player';

/** Las funciones de la app y quién las usa. La tabla completa de rutas está en docs/api/roles.md. */
export const FEATURES = {
  playAi:          'any',     // contra la IA (sin ELO), deshacer, salir sin registrar
  prediction:      'any',     // la barra de probabilidad
  history:         'any',     // tus partidas y la repetición
  ranking:         'any',     // ver el ranking (un invitado no aparece)
  tournamentsView: 'any',     // ver torneos y llaves
  preferences:     'any',     // tablero 2D/3D, tema y acento
  playOnline:      'player',  // emparejamiento y partidas con ELO entre personas, revancha, tablas
  tournamentsJoin: 'player',  // inscribirse
  coach:           'player',  // análisis y plan del entrenador (gasta el modelo y CPU)
  profileEdit:     'player',  // nombre, usuario, bio, país y foto
} as const satisfies Record<string, RouteAccess>;
export type Feature = keyof typeof FEATURES;

export const canUse = (role: Role, feature: Feature): boolean => canAccess(FEATURES[feature], role);
