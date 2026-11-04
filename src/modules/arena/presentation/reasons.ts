import { sanEs } from '@/components/chess/san';
import type { Color, EndReason } from '@/modules/arena/infrastructure/dto/arenaSchemas';

export type Outcome = 'win' | 'loss' | 'draw';
export const outcomeOf = (winner: Color | null, you: Color): Outcome => (winner === null ? 'draw' : winner === you ? 'win' : 'loss');
export const OUTCOME_TITLE: Record<Outcome, string> = { win: 'Victoria.', loss: 'Derrota.', draw: 'Tablas.' };

/** Motivo del final en español (guía §7.6). `ply` = jugadas hechas; `lastSan` en inglés, como llega de la API. */
export function reasonText(reason: EndReason, outcome: Outcome, rival: string, ply: number, lastSan: string | null) {
  const n = Math.ceil(ply / 2), san = lastSan ? sanEs(lastSan) : '';
  switch (reason) {
    case 'checkmate': return outcome === 'win' ? `Jaque mate con ${san} en ${n} jugadas.` : `${rival} te dio jaque mate con ${san}.`;
    case 'resign': return outcome === 'win' ? `${rival} se rindió.` : `Te rendiste en la jugada ${n}.`;
    case 'timeout': return outcome === 'win' ? `A ${rival} se le acabó el tiempo.` : outcome === 'loss' ? 'Se te acabó el tiempo.' : 'Se acabó el tiempo, pero no queda material para dar mate.';
    case 'agreement': return `Por acuerdo en la jugada ${n}.`;
    case 'stalemate': return 'Rey ahogado: no quedan jugadas legales.';
    case 'insufficient': return 'No queda material para dar mate.';
    case 'threefold': return 'La misma posición se repitió tres veces.';
    case 'fifty': return '50 jugadas sin capturas ni movimientos de peón.';
    case 'noshow': return outcome === 'win' ? `W.O.: ${rival} no hizo su primera jugada a tiempo.` : 'W.O.: no hiciste tu primera jugada a tiempo.';
  }
}

/** ELO con K = 32 (la misma fórmula del contrato): Δ = round(32 × (S − E)). */
export const eloDelta = (you: number, rival: number, score: 0 | 0.5 | 1) =>
  Math.round(32 * (score - 1 / (1 + 10 ** ((rival - you) / 400))));

/** Motivo corto para listas: "Victoria · jaque mate · 10 + 0". */
export const REASON_SHORT: Record<EndReason, string> = {
  checkmate: 'jaque mate', resign: 'abandono', timeout: 'tiempo', agreement: 'acuerdo',
  stalemate: 'rey ahogado', insufficient: 'material insuficiente', threefold: 'repetición', fifty: '50 jugadas', noshow: 'W.O.',
};

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
/** "hace un momento", "hace 2 horas", "hace 12 días". */
export function ago(iso: string, now: number) {
  const s = Math.round((Date.parse(iso) - now) / 1000);
  if (s > -60) return 'hace un momento';
  if (s > -3600) return rtf.format(Math.round(s / 60), 'minute');
  if (s > -86400) return rtf.format(Math.round(s / 3600), 'hour');
  return rtf.format(Math.round(s / 86400), 'day');
}

/** "Hoy", "Ayer" o "14 oct", con la fecha local. */
export function dayLabel(iso: string, now: number) {
  const day = (t: number) => new Date(t).toDateString();
  const t = Date.parse(iso);
  if (day(t) === day(now)) return 'Hoy';
  if (day(t) === day(now - 86_400_000)) return 'Ayer';
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(t).replace('.', '');
}
