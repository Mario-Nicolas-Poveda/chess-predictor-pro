import type { BracketGame, BracketSide, NextTournamentGame } from '@/modules/tournaments/infrastructure/dto/tournamentSchemas';
import { fmtCountdown } from './deadline';

const name = (s: BracketSide) => s.player?.username ?? 'por definir';
const winnerSide = (g: BracketGame) => (g.top.advanced ? g.top : g.bottom.advanced ? g.bottom : null);
const loserSide = (g: BracketGame) => (g.top.advanced ? g.bottom : g.top);
const whiteSide = (g: BracketGame) => (g.top.color === 'white' ? g.top : g.bottom);

/** Línea de estado de una partida de la llave. `nowMs` ya corregido con la hora del servidor. */
export function gameStatus(g: BracketGame, nowMs: number): string {
  switch (g.state) {
    case 'preview': return g.bye ? 'Pasaría directo' : 'Por jugar';
    case 'tbd': return 'Por definir';
    case 'bye': return 'Pasa directo: faltan jugadores';
    case 'ready': {
      const left = g.deadline ? Date.parse(g.deadline) - nowMs : 0;
      return left > 0 ? `Lista · ${name(whiteSide(g))} tiene ${fmtCountdown(left)} para jugar` : 'Lista · revisando el plazo…';
    }
    case 'playing': return `En juego · jugada ${Math.floor(g.ply / 2) + 1}`;
    case 'done': {
      const w = winnerSide(g);
      if (!w) return 'Terminada';
      if (g.decidedBy === 'draw') return `Tablas: pasa ${name(w)} (negras)`;
      if (g.decidedBy === 'noshow') return `${name(loserSide(g))} no jugó: W.O.`;
      return w.color === 'black' ? `Ganó ${name(w)} con negras` : `Ganó ${name(w)}`;
    }
  }
}

const sideText = (s: BracketSide) =>
  s.player ? `${s.player.username}${s.color ? ` con ${s.color === 'white' ? 'blancas' : 'negras'}` : ''}` : 'por definir';

/** Para lectores de pantalla: "Cuartos, partida 1: sebas_rey con blancas contra mario_p con negras. Lista…" */
export function gameLabel(g: BracketGame, roundName: string, nowMs: number): string {
  const vs = g.bye ? `${sideText(g.top)}, sin rival` : `${sideText(g.top)} contra ${sideText(g.bottom)}`;
  return `${roundName}, partida ${g.slot}: ${vs}. ${gameStatus(g, nowMs)}`;
}

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
