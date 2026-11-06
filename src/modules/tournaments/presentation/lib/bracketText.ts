import type { NextTournamentGame } from '@/modules/tournaments/infrastructure/dto/tournamentSchemas';
import { fmtCountdown } from './deadline';

/** Aviso de tu partida de torneo (lista de torneos, llaves y celular). `nowMs` ya corregido con la hora del servidor. */
export function nextGameText(n: NextTournamentGame, nowMs: number): { title: string; clock: string | null; text: string; cta: string } {
  const opp = n.opponent.username, round = n.stage.name.toLowerCase();
  if (n.matchStatus === 'active') {
    return {
      title: `Estás jugando: ${round}`, clock: null,
      text: n.color === 'black' ? `Contra ${opp}. Juegas con negras: si hay tablas, pasas tú.` : `Contra ${opp}. Juegas con blancas: si hay tablas, pasa ${opp}.`,
      cta: 'Volver a la partida',
    };
  }
  const left = n.deadline ? Date.parse(n.deadline) - nowMs : 0;
  if (left <= 0) return { title: 'Revisando el plazo…', clock: null, text: `Tu partida contra ${opp}.`, cta: 'Ir a la partida' };
  // clock aparte: cambia cada segundo y no debe leerse en voz alta cada vez
  return n.color === 'white'
    ? { title: 'Tu partida está lista', clock: fmtCountdown(left), text: `Contra ${opp}, con blancas. Haz tu primera jugada antes de que se acabe el tiempo o pierdes por W.O.`, cta: 'Entrar a la partida' }
    : { title: 'Tu partida está lista', clock: fmtCountdown(left), text: `Contra ${opp}, con negras. Si no hace su primera jugada a tiempo, ganas por W.O.`, cta: 'Entrar a la partida' };
}
