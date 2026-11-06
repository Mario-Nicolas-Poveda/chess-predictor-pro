import type { TournamentSummary } from '@/modules/tournaments/infrastructure/dto/tournamentSchemas';

export const tc = (t: TournamentSummary['timeControl']) => t.replace('+', ' + ');
const strip = (s: string) => s.replace('.', '');
/** "jue 3 dic" con la hora local. */
export const day = (iso: string) => {
  const d = new Date(iso);
  return `${strip(d.toLocaleDateString('es-CO', { weekday: 'short' }))} ${d.getDate()} ${strip(d.toLocaleDateString('es-CO', { month: 'short' }))}`;
};
/** "4:00 p. m." */
export const time = (iso: string) => new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
export const sameDay = (iso: string, nowMs: number) => new Date(iso).toDateString() === new Date(nowMs).toDateString();
export const bracketHref = (id: string) => `/dashboard/tournaments/${id}`;
