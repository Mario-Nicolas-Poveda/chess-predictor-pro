import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';
import { ConflictError, ForbiddenError, NotFoundError, UnprocessableError, type AppError } from '@/core/shared/errors/AppError';
import type {
  GameRecord, NextGameRecord, PlayerRecord, TournamentListItemRecord, TournamentRecord, TournamentRepository,
} from '../application/ports/TournamentRepository';
import type { PlayerSummary } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import type { CreateTournamentInput } from './dto/tournamentSchemas';

const RPC_ERRORS: Record<string, () => AppError> = {
  TOURNAMENT_NOT_FOUND: () => new NotFoundError('TOURNAMENT_NOT_FOUND', 'El torneo no existe'),
  NOT_REGISTERED:       () => new NotFoundError('NOT_REGISTERED', 'No estás inscrito en este torneo'),
  TOURNAMENT_CLOSED:    () => new ConflictError('TOURNAMENT_CLOSED', 'Las inscripciones ya cerraron: el torneo empezó o se canceló'),
  TOURNAMENT_FULL:      () => new ConflictError('TOURNAMENT_FULL', 'El torneo está lleno'),
  FORBIDDEN:            () => new ForbiddenError('FORBIDDEN', 'Los bots y la IA no juegan torneos'),
  STARTS_IN_PAST:       () => new UnprocessableError('STARTS_IN_PAST', 'La hora de inicio ya pasó'),
};
/** 'CODIGO' → error HTTP. Lo demás sigue como 500 (sin mostrar el mensaje). */
export const fromRpc = (e: { message: string }) => RPC_ERRORS[e.message.split(':')[0] ?? '']?.() ?? e;

/* eslint-disable @typescript-eslint/no-explicit-any -- JSON de las funciones SQL, sin tipos generados */
/** Postgres devuelve "2026-11-03T21:14:50.80996+00:00": se normaliza a ISO con Z (lo mismo que el resto de la API). */
const iso = (v: string | null) => (v ? new Date(v).toISOString() : null);
const toPlayerSummary = (u: any): PlayerSummary =>
  ({ id: u.id, username: u.username, displayName: u.display_name, avatarUrl: u.avatar_url, elo: u.elo });
const toPlayer = (p: any): PlayerRecord =>
  ({ ...toPlayerSummary(p), seed: p.seed, eloAtStart: p.elo_at_start, joinedAt: iso(p.joined_at)! });
const toGame = (g: any): GameRecord => ({
  round: g.round, slot: g.slot, whiteId: g.white_id, blackId: g.black_id, matchId: g.match_id, status: g.status,
  winnerId: g.winner_id, decidedBy: g.decided_by, matchStatus: g.match_status, result: g.result,
  ply: g.ply ?? 0, createdAt: iso(g.created_at),
});
export const toListItem = (t: any): TournamentListItemRecord => ({
  id: t.id, name: t.name, timeControl: t.time_control, size: t.size, bracketSize: t.bracket_size,
  startsAt: iso(t.starts_at)!, status: t.status, endedAt: iso(t.ended_at), players: t.players, joined: t.joined,
  stage: t.stage, winner: t.winner ? toPlayerSummary(t.winner) : null,
});
export const toNext = (n: any): NextGameRecord => ({
  tournamentId: n.tournament_id, tournamentName: n.tournament_name, matchId: n.match_id, round: n.round,
  bracketSize: n.bracket_size, color: n.color, matchStatus: n.match_status, deadline: iso(n.deadline),
  opponent: toPlayerSummary(n.opponent),
});
export const toTournamentRecord = (t: any): TournamentRecord => ({
  id: t.id, name: t.name, timeControl: t.time_control, size: t.size, bracketSize: t.bracket_size,
  startsAt: iso(t.starts_at)!, noshowS: t.noshow_s, status: t.status, startedAt: iso(t.started_at), endedAt: iso(t.ended_at),
  winnerId: t.winner_id, players: t.players.map(toPlayer), games: t.games.map(toGame),
});
/* eslint-enable @typescript-eslint/no-explicit-any */

export class SupabaseTournamentRepository implements TournamentRepository {
  private readonly db = supabaseAdmin;

  async list(userId: string) {
    const { data, error } = await this.db.rpc('tour_list', { p_user: userId });
    if (error) throw error;
    return { tournaments: (data.tournaments ?? []).map(toListItem), next: data.next ? toNext(data.next) : null };
  }
  async detail(id: string): Promise<TournamentRecord> {
    const { data, error } = await this.db.rpc('tour_detail', { p_t: id });
    if (error) throw fromRpc(error);
    return toTournamentRecord(data);
  }
  async join(id: string, userId: string) {
    const { data, error } = await this.db.rpc('tour_join', { p_t: id, p_user: userId });
    if (error) throw fromRpc(error);
    return data as 'created' | 'exists';
  }
  async leave(id: string, userId: string) {
    const { error } = await this.db.rpc('tour_leave', { p_t: id, p_user: userId });
    if (error) throw fromRpc(error);
  }
  async create(i: CreateTournamentInput) {
    const { data, error } = await this.db.rpc('tour_create', {
      p_name: i.name, p_time_control: i.timeControl, p_size: i.size,
      p_starts_at: new Date(Date.now() + i.startsInS * 1000).toISOString(), p_noshow_s: i.noshowS,
    });
    if (error) throw fromRpc(error);
    return (data as { id: string }).id;
  }
}
