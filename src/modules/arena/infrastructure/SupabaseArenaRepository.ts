import 'server-only';
import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';
import { ConflictError, NotFoundError, type AppError } from '@/core/shared/errors/AppError';
import type { AiLevel, AiTimeControl } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import type { TimeControl } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import type { ArenaRepository, CommitMove, HistoryRow, Outcome3 } from '../domain/ArenaRepository';
import type { MatchRecord, MoveRecord } from '../domain/Match';
import { matchFinished, matchNotActive, matchNotFound, noDrawOffer, notAiMatch, ownDrawOffer, stalePly } from '../domain/errors';
import type { Color, EndReason, MatchStatus } from './dto/arenaSchemas';

type MatchRow = { id: string; white_id: string; black_id: string; time_control: TimeControl | 'none'; status: MatchStatus;
  created_at: string; version: number; ply: number; fen: string; white_ms: number; black_ms: number; increment_ms: number;
  turn_started_at: string | null; started_at: string | null; ended_at: string | null; result: Color | 'draw' | null;
  end_reason: EndReason | null; draw_offer_by: Color | null; draw_offered_at: string | null;
  rematch_offer_by: Color | null; rematch_offered_at: string | null;
  rematch_id: string | null; white_elo_before: number | null; black_elo_before: number | null;
  white_elo_after: number | null; black_elo_after: number | null; rated: boolean; ai_prediction: boolean; takebacks: number };
type HistoryDbRow = { id: string; time_control: TimeControl | 'none'; ended_at: string; your_color: Color; outcome: Outcome3;
  end_reason: EndReason; elo_delta: number; plies: number; opponent_id: string; opponent_elo: number; rated: boolean };
type MoveRow ={ ply: number; uci: string; san: string; white_ms: number; black_ms: number; created_at: string };

const MOVE_COLS = 'ply, uci, san, white_ms, black_ms, created_at';
const date = (s: string | null) => (s ? new Date(s) : null);
const mapMatch = (r: MatchRow): MatchRecord => ({ id: r.id, whiteId: r.white_id, blackId: r.black_id,
  timeControl: r.time_control, status: r.status, createdAt: new Date(r.created_at), version: r.version, ply: r.ply,
  fen: r.fen, whiteMs: r.white_ms, blackMs: r.black_ms, incrementMs: r.increment_ms,
  turnStartedAt: date(r.turn_started_at), startedAt: date(r.started_at), endedAt: date(r.ended_at),
  result: r.result, endReason: r.end_reason, drawOfferBy: r.draw_offer_by, drawOfferedAt: date(r.draw_offered_at),
  rematchOfferBy: r.rematch_offer_by,
  rematchOfferedAt: date(r.rematch_offered_at), rematchId: r.rematch_id, whiteEloBefore: r.white_elo_before,
  blackEloBefore: r.black_elo_before, whiteEloAfter: r.white_elo_after, blackEloAfter: r.black_elo_after,
  rated: r.rated, aiPrediction: r.ai_prediction, takebacks: r.takebacks });
const mapMove = (r: MoveRow): MoveRecord =>
  ({ ply: r.ply, uci: r.uci, san: r.san, whiteMs: r.white_ms, blackMs: r.black_ms, createdAt: new Date(r.created_at) });

// raise exception 'CÓDIGO' de las funciones SQL → AppError; lo demás sigue como error (500 sin detalle)
const RPC_ERRORS: Record<string, () => AppError> = {
  STALE_PLY: () => stalePly(),
  MATCH_NOT_FOUND: matchNotFound,
  MATCH_NOT_ACTIVE: () => matchNotActive(),
  NO_DRAW_OFFER: noDrawOffer,
  OWN_DRAW_OFFER: ownDrawOffer,
  MATCH_NOT_FINISHED: () => new ConflictError('MATCH_NOT_FINISHED', 'La revancha se pide cuando la partida termina'),
  REMATCH_ALREADY_OFFERED: () => new ConflictError('REMATCH_ALREADY_OFFERED', 'Ya pediste la revancha'),
  ACTIVE_MATCH_EXISTS: () => new ConflictError('ACTIVE_MATCH_EXISTS', 'Uno de los dos ya tiene otra partida o está buscando'),
  NOT_AI_MATCH: notAiMatch,
  NOT_RATED_MATCH: () => new ConflictError('NOT_RATED_MATCH', 'Contra la IA no hay revancha: empieza otra partida'),
  AI_THINKING: () => new ConflictError('AI_THINKING', 'Espera a que la IA juegue'),
  NOTHING_TO_UNDO: () => new ConflictError('NOTHING_TO_UNDO', 'No hay jugadas tuyas para deshacer'),
  MATCH_FINISHED: () => matchFinished(),
  AI_LEVEL_NOT_FOUND: () => new NotFoundError('AI_LEVEL_NOT_FOUND', 'Ese nivel no existe'),
};
// los errores con dato llegan como 'CODIGO:valor'
const fromRpc = (e: { message: string }) => {
  const [code = '', arg] = e.message.split(':');
  if (code === 'AI_GAME_IN_PROGRESS')
    return new ConflictError('AI_GAME_IN_PROGRESS', 'Ya tienes una partida contra la IA sin terminar', undefined, { matchId: arg });
  return RPC_ERRORS[code]?.() ?? e;
};

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

  async history(userId: string, outcome: Outcome3 | null, before: string | null, limit: number, rated?: boolean) {
    const { data, error } = await supabaseAdmin.rpc('arena_history',
      { p_user: userId, p_outcome: outcome, p_before: before, p_limit: limit, p_rated: rated ?? null });
    if (error) throw error;
    return (data as HistoryDbRow[]).map((r): HistoryRow => ({ id: r.id, timeControl: r.time_control,
      endedAt: new Date(r.ended_at), yourColor: r.your_color, outcome: r.outcome, reason: r.end_reason,
      eloDelta: r.elo_delta, plies: r.plies, opponentId: r.opponent_id, opponentElo: r.opponent_elo, rated: r.rated }));
  }

  async eloSeries(userId: string, days: number) {
    const { data, error } = await supabaseAdmin.rpc('arena_elo_series', { p_user: userId, p_days: days });
    if (error) throw error;
    return (data as { day: string; elo: number }[]).map(r => ({ date: r.day, elo: r.elo }));
  }

  async rematch(id: string, by: Color) {
    const { data, error } = await supabaseAdmin.rpc('arena_rematch', { p_match: id, p_by: by });
    if (error) throw fromRpc(error);
    return data as string | null;
  }

  async cancelRematch(id: string) {
    const { data, error } = await supabaseAdmin.from('matches')
      .update({ rematch_offer_by: null, rematch_offered_at: null })
      .eq('id', id).not('rematch_offer_by', 'is', null).is('rematch_id', null).select('id');
    if (error) throw error;
    return data.length > 0;
  }

  async createAiGame(userId: string, level: AiLevel, color: Color, timeControl: AiTimeControl, prediction: boolean) {
    const { data, error } = await supabaseAdmin.rpc('ai_create_game',
      { p_user: userId, p_level: level, p_color: color, p_time_control: timeControl, p_prediction: prediction });
    if (error) throw fromRpc(error);
    return data as string;
  }

  async openAiGame(userId: string) {
    const { data, error } = await supabaseAdmin.from('matches').select('*').eq('rated', false)
      .in('status', ['pending', 'active']).or(`white_id.eq.${userId},black_id.eq.${userId}`)
      .order('created_at', { ascending: false }).limit(1).maybeSingle<MatchRow>();
    if (error) throw error;
    return data ? mapMatch(data) : null;
  }

  async openRatedMatch(userId: string) {
    const { data, error } = await supabaseAdmin.rpc('mm_open_match', { p_user: userId }).maybeSingle<MatchRow>();
    if (error) throw error;
    return data ? mapMatch(data) : null;
  }

  async takeback(id: string, by: Color, expectedPly: number) {
    const { data, error } = await supabaseAdmin.rpc('arena_takeback', { p_match: id, p_color: by, p_expected_ply: expectedPly });
    if (error) throw fromRpc(error);
    return data as number;
  }

  async claimAiTurn(id: string, ply: number, ms: number) {
    const { data, error } = await supabaseAdmin.rpc('ai_claim', { p_match: id, p_ply: ply, p_ms: ms });
    if (error) throw error;
    return data as boolean;
  }

  async botIds(ids: string[]) {
    const { data, error } = await supabaseAdmin.from('users').select('id').in('id', ids).eq('is_bot', true);
    if (error) throw error;
    return (data as { id: string }[]).map(r => r.id);
  }
}
