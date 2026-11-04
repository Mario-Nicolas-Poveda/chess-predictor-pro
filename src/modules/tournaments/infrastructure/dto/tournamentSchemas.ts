import { z } from 'zod';
import type { PlayerSummary } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';

/** Contratos de torneos y llaves. Solo zod y tipos: se importan en el navegador. */

export const TournamentParamsSchema = z.object({ id: z.uuid({ error: 'Debe ser un UUID' }) });

/** Solo para POST /dev/tournaments (ENABLE_DEV_ROUTES=true) y scripts/tournament.ts. */
export const CreateTournamentSchema = z.object({
  name: z.string().trim().min(3, { error: 'Mínimo 3 caracteres' }).max(60, { error: 'Máximo 60 caracteres' }).default('Torneo de prueba'),
  size: z.union([z.literal(4), z.literal(8)], { error: 'Debe ser 4 u 8' }).default(4),
  timeControl: z.enum(['3+2', '5+0', '10+0'], { error: 'Debe ser 3+2, 5+0 o 10+0' }).default('3+2'),
  startsInS: z.int().min(1).max(30 * 86_400).default(10),
  noshowS: z.int().min(5).max(600).default(300),
}).strict();
export type CreateTournamentInput = z.infer<typeof CreateTournamentSchema>;

export type TournamentStatus = 'open' | 'running' | 'finished' | 'cancelled';
export type TournamentTimeControl = '3+2' | '5+0' | '10+0';

/** Consulta otra vez en: en juego o a punto de empezar 15 s (el timbre avisa antes); lejos 60 s; terminado 0. */
export const TOURNAMENT_POLL_MS = { live: 15_000, later: 60_000, done: 0 } as const;
/** "A punto de empezar" = faltan menos de 10 minutos. */
export const SOON_MS = 10 * 60_000;

export interface Stage { round: number; rounds: number; name: string }   // name: 'Cuartos' | 'Semifinal' | 'Final'

export interface TournamentSummary {
  id: string;
  name: string;
  timeControl: TournamentTimeControl;
  size: 4 | 8;                           // cupos
  startsAt: string;
  status: TournamentStatus;
  players: number;                       // inscritos
  joined: boolean;                       // ¿estás inscrito?
  stage: Stage | null;                   // en juego: la ronda más baja que se está jugando
  winner: PlayerSummary | null;
  endedAt: string | null;
}

export interface NextTournamentGame {
  tournamentId: string;
  tournamentName: string;
  matchId: string;
  stage: Stage;
  color: 'white' | 'black';
  opponent: PlayerSummary;
  matchStatus: 'pending' | 'active';
  deadline: string | null;               // 'pending': hasta cuándo pueden las blancas hacer su primera jugada
}

export interface TournamentListResponse {
  tournaments: TournamentSummary[];      // en juego, abiertos (por hora) y terminados de los últimos 30 días
  next: NextTournamentGame | null;       // tu partida de torneo sin terminar, si tienes una
  pollAfterMs: number;
}

export interface BracketPlayer extends PlayerSummary { seed: number | null }

export type GameScore = '1' | '0' | '½' | 'W.O.' | null;

export interface BracketSide {
  player: BracketPlayer | null;          // null = por definir (o nadie: ver game.bye)
  color: 'white' | 'black' | null;       // null mientras no se sabe
  score: GameScore;
  advanced: boolean;                     // pasó a la siguiente ronda
}

export type BracketGameState = 'preview' | 'tbd' | 'bye' | 'ready' | 'playing' | 'done';

export interface BracketGame {
  round: number;
  slot: number;                          // 1 = arriba
  top: BracketSide;                      // la llave se dibuja con top y bottom (no por color)
  bottom: BracketSide;
  bye: boolean;                          // pasa directo: bottom.player es null
  state: BracketGameState;               // preview: "si empezara ahora" · tbd: falta saber quién juega
  matchId: string | null;
  ply: number;                           // medias jugadas (0 si no hay partida)
  decidedBy: 'bye' | 'result' | 'draw' | 'noshow' | null;
  deadline: string | null;               // 'ready': plazo para la primera jugada de las blancas
}

export interface BracketRound { round: number; name: string; games: BracketGame[] }

export interface TournamentDetail extends TournamentSummary {
  noshowS: number;
  startedAt: string | null;
  bracketSize: 4 | 8 | null;             // null mientras está abierto
  entrants: BracketPlayer[];             // inscritos por siembra (abierto: por ELO, la siembra que tendrían)
  rounds: BracketRound[];                // completas, con 'tbd'; abierto: vista previa; cancelado: []
  you: { joined: boolean; seed: number | null; alive: boolean; nextMatchId: string | null };
  pollAfterMs: number;
}

export interface RegistrationDTO { tournamentId: string; joinedAt: string; seed: number | null }
