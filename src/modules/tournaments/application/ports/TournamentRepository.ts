import type { PlayerSummary } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import type { CreateTournamentInput, TournamentStatus, TournamentTimeControl } from '../../infrastructure/dto/tournamentSchemas';

export interface PlayerRecord extends PlayerSummary { seed: number | null; eloAtStart: number | null; joinedAt: string }

export interface GameRecord {
  round: number; slot: number;
  whiteId: string; blackId: string | null;
  matchId: string | null;
  status: 'bye' | 'playing' | 'done';
  winnerId: string | null;
  decidedBy: 'bye' | 'result' | 'draw' | 'noshow' | null;
  matchStatus: 'pending' | 'active' | 'finished' | 'aborted' | null;
  result: 'white' | 'black' | 'draw' | null;
  ply: number;
  createdAt: string | null;
}

export interface TournamentRecord {
  id: string; name: string; timeControl: TournamentTimeControl; size: 4 | 8; bracketSize: 4 | 8 | null;
  startsAt: string; noshowS: number; status: TournamentStatus;
  startedAt: string | null; endedAt: string | null; winnerId: string | null;
  players: PlayerRecord[];               // por siembra; si no hay siembra, por ELO y llegada
  games: GameRecord[];
}

export interface TournamentListItemRecord {
  id: string; name: string; timeControl: TournamentTimeControl; size: 4 | 8; bracketSize: 4 | 8 | null;
  startsAt: string; status: TournamentStatus; endedAt: string | null;
  players: number; joined: boolean; stage: number | null; winner: PlayerSummary | null;
}

export interface NextGameRecord {
  tournamentId: string; tournamentName: string; matchId: string; round: number; bracketSize: 4 | 8;
  color: 'white' | 'black'; matchStatus: 'pending' | 'active'; deadline: string | null; opponent: PlayerSummary;
}

/** Todo lo de torneos en la BD. Lo atómico (inscribir, salir, empezar, avanzar) vive en funciones SQL (0009). */
export interface TournamentRepository {
  /** RPC tour_list: aplica el paso del tiempo a los torneos que lo necesitan y lee la lista. */
  list(userId: string): Promise<{ tournaments: TournamentListItemRecord[]; next: NextGameRecord | null }>;
  /** RPC tour_detail: 404 TOURNAMENT_NOT_FOUND. */
  detail(id: string): Promise<TournamentRecord>;
  /** RPC tour_join: 404 · 403 · 409 TOURNAMENT_CLOSED / TOURNAMENT_FULL. */
  join(id: string, userId: string): Promise<'created' | 'exists'>;
  /** RPC tour_leave: 404 TOURNAMENT_NOT_FOUND / NOT_REGISTERED · 409 TOURNAMENT_CLOSED. */
  leave(id: string, userId: string): Promise<void>;
  /** RPC tour_create (scripts y ruta de desarrollo). Devuelve el id. */
  create(input: CreateTournamentInput): Promise<string>;
}
