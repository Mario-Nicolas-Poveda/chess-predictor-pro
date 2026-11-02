import type { Square } from '@/components/chess/types';
import type { BoardArrow } from '@/components/three/scenes/gameBoardScene';
import type { Motif, MoveClass, ReviewMoveDTO } from '@/modules/coach/infrastructure/dto/coachSchemas';

/**
 * Cómo se muestra cada clase. El color nunca va solo: siempre con el símbolo y la etiqueta.
 * Colores (validados para contraste ≥ 3:1 en los 4 temas, una sola familia de tono, de menos a más grave):
 *   claros (Pergamino, Salvia, Pizarra):  --cls-inaccuracy #c27c3a · --cls-mistake #a14d26 · --cls-blunder #6f2113
 *   Noche:                                 --cls-inaccuracy #b0643b · --cls-mistake #de8a55 · --cls-blunder #f6bf94
 */
export const MOVE_CLASS_UI: Record<MoveClass, { label: string; short: string; symbol: string; color: string | null }> = {
  best:       { label: 'Excelente',   short: 'Excelente',   symbol: '',   color: null },   // pierde < 2 puntos (puede no ser la 1.ª del motor)
  good:       { label: 'Buena',       short: 'Buena',       symbol: '',   color: null },
  inaccuracy: { label: 'Imprecisión', short: 'Imprecisión', symbol: '?!', color: 'var(--cls-inaccuracy)' },
  mistake:    { label: 'Error',       short: 'Error',       symbol: '?',  color: 'var(--cls-mistake)' },
  blunder:    { label: 'Error grave', short: 'Error grave', symbol: '??', color: 'var(--cls-blunder)' },
};

export const isError = (c: MoveClass) => c === 'inaccuracy' || c === 'mistake' || c === 'blunder';

const arrow = (uci: string, tone: BoardArrow['tone']): BoardArrow => ({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, tone });

/** Las flechas de un momento clave: la que jugaste y la mejor (si no jugaste esa). */
export const momentArrows = (m: ReviewMoveDTO): BoardArrow[] =>
  [arrow(m.uci, 'played'), ...(m.best ? [arrow(m.best.uci, 'hint')] : [])];

export const TIP_CATEGORY_UI = {
  opening:  { label: 'Apertura' },
  tactics:  { label: 'Táctica' },
  strategy: { label: 'Estrategia' },
  endgame:  { label: 'Final' },
  time:     { label: 'Reloj' },
  mindset:  { label: 'Mentalidad' },
} as const;

/** Lo que más se repite, en la página "Entrenador" (en segunda persona). */
export const MOTIF_UI: Record<Motif, string> = {
  hanging_piece: 'Dejaste piezas sin defensa',
  missed_capture: 'Se te escaparon capturas',
  missed_mate: 'Dejaste pasar mates',
  allowed_mate: 'Permitiste mates',
  early_queen: 'Sacaste la dama muy pronto',
  no_castle: 'No enrocaste a tiempo',
  undeveloped: 'Tardaste en sacar las piezas menores',
  time_trouble: 'Te quedaste sin tiempo',
};
