import 'server-only';
import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';
import type { AppError } from '@/core/shared/errors/AppError';
import type { TimeControl } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import type { ArenaRepository, CommitMove } from '../domain/ArenaRepository';
import type { MatchRecord, MoveRecord } from '../domain/Match';
import { matchNotActive, matchNotFound, noDrawOffer, ownDrawOffer, stalePly } from '../domain/errors';
import type { Color, EndReason, MatchStatus } from './dto/arenaSchemas';

type MatchRow = { id: string; white_id: string; black_id: string; time_control: TimeControl; status: MatchStatus;
  created_at: string; version: number; ply: number; fen: string; white_ms: number; black_ms: number; increment_ms: number;
  turn_started_at: string | null; started_at: string | null; ended_at: string | null; result: Color | 'draw' | null;
  end_reason: EndReason | null; draw_offer_by: Color | null; rematch_offer_by: Color | null; rematch_offered_at: string | null;
  rematch_id: string | null; white_elo_before: number | null; black_elo_before: number | null;
  white_elo_after: number | null; black_elo_after: number | null };
type MoveRow = { ply: number; uci: string; san: string; white_ms: number; black_ms: number; created_at: string };

const MOVE_COLS = 'ply, uci, san, white_ms, black_ms, created_at';
const date = (s: string | null) => (s ? new Date(s) : null);
const mapMatch = (r: MatchRow): MatchRecord => ({ id: r.id, whiteId: r.white_id, blackId: r.black_id,
  timeControl: r.time_control, status: r.status, createdAt: new Date(r.created_at), version: r.version, ply: r.ply,
  fen: r.fen, whiteMs: r.white_ms, blackMs: r.black_ms, incrementMs: r.increment_ms,
  turnStartedAt: date(r.turn_started_at), startedAt: date(r.started_at), endedAt: date(r.ended_at),
  result: r.result, endReason: r.end_reason, drawOfferBy: r.draw_offer_by, rematchOfferBy: r.rematch_offer_by,
  rematchOfferedAt: date(r.rematch_offered_at), rematchId: r.rematch_id, whiteEloBefore: r.white_elo_before,
  blackEloBefore: r.black_elo_before, whiteEloAfter: r.white_elo_after, blackEloAfter: r.black_elo_after });
const mapMove = (r: MoveRow): MoveRecord =>
  ({ ply: r.ply, uci: r.uci, san: r.san, whiteMs: r.white_ms, blackMs: r.black_ms, createdAt: new Date(r.created_at) });

// raise exception 'CÓDIGO' de las funciones SQL → AppError; lo demás sigue como error (500 sin detalle)
const RPC_ERRORS: Record<string, () => AppError> = {
  STALE_PLY: () => stalePly(),
  MATCH_NOT_FOUND: matchNotFound,
  MATCH_NOT_ACTIVE: () => matchNotActive(),
  NO_DRAW_OFFER: noDrawOffer,
  OWN_DRAW_OFFER: ownDrawOffer,
};
const fromRpc = (e: { message: string }) => RPC_ERRORS[e.message]?.() ?? e;

export class SupabaseArenaRepository implements ArenaRepository {
  async settle(id: string) {
    const { error } = await supabaseAdmin.rpc('arena_settle', { p_match: id });
    if (error) throw fromRpc(error);
  }

  async findMatch(id: string) {
    const { data, error } = await supabaseAdmin.from('matches').select('*').eq('id', id).maybeSingle<MatchRow>();
    if (error) throw error;
    return data ? mapMatch(data) : null;
  }

  async listMoves(id: string, sincePly = 0) {
    const { data, error } = await supabaseAdmin.from('match_moves')
      .select(MOVE_COLS).eq('match_id', id).gt('ply', sincePly).order('ply');
    if (error) throw error;
    return (data as MoveRow[]).map(mapMove);
  }

  async findMove(id: string, ply: number) {
    const { data, error } = await supabaseAdmin.from('match_moves')
      .select(MOVE_COLS).eq('match_id', id).eq('ply', ply).maybeSingle<MoveRow>();
    if (error) throw error;
    return data ? mapMove(data) : null;
  }

  async commitMove(c: CommitMove) {
    const { data, error } = await supabaseAdmin.rpc('arena_commit_move', {
      p_match: c.matchId, p_expected_ply: c.expectedPly, p_mover: c.mover, p_uci: c.uci, p_san: c.san, p_fen: c.fen,
      p_white_ms: c.whiteMs, p_black_ms: c.blackMs, p_result: c.outcome?.result ?? null, p_reason: c.outcome?.reason ?? null,
    });
    if (error) throw fromRpc(error);
    return data as number;
  }

  async finish(id: string, result: Color | 'draw', reason: EndReason) {
    const { error } = await supabaseAdmin.rpc('arena_finish', { p_match: id, p_result: result, p_reason: reason });
    if (error) throw fromRpc(error);
  }

  async offerDraw(id: string, by: Color) {
    const { data, error } = await supabaseAdmin.from('matches')
      .update({ draw_offer_by: by, draw_offered_at: new Date().toISOString() })
      .eq('id', id).eq('status', 'active').is('draw_offer_by', null).select('id');
    if (error) throw error;
    return data.length > 0;
  }

  async clearDrawOffer(id: string) {
    const { data, error } = await supabaseAdmin.from('matches')
      .update({ draw_offer_by: null, draw_offered_at: null })
      .eq('id', id).not('draw_offer_by', 'is', null).select('id');
    if (error) throw error;
    return data.length > 0;
  }

  async acceptDraw(id: string, by: Color) {
    const { error } = await supabaseAdmin.rpc('arena_accept_draw', { p_match: id, p_by: by });
    if (error) throw fromRpc(error);
  }
}
