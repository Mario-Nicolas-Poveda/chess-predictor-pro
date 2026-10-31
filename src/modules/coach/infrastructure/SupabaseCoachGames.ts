import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';
import { UnauthorizedError } from '@/core/shared/errors/AppError';
import type { CoachGame, CoachGames } from '../application/ports/CoachGames';
import type { StoredMove } from '../domain/playedMoves';

interface GameRow {
  id: string; white_id: string; black_id: string; status: CoachGame['status']; result: CoachGame['result'];
  end_reason: string | null; ended_at: string | null; ply: number; time_control: string;
  white_elo_before: number | null; black_elo_before: number | null;
  white: { ai_level: CoachGame['whiteAi'] } | null; black: { ai_level: CoachGame['blackAi'] } | null;
}
interface MoveRow { ply: number; uci: string; san: string; fen_after: string; white_ms: number; black_ms: number }

/** Lee partidas de la arena para el coach. */
export class SupabaseCoachGames implements CoachGames {
  async find(matchId: string): Promise<CoachGame | null> {
    const { data: m, error } = await supabaseAdmin.from('matches')
      .select(`id, white_id, black_id, status, result, end_reason, ended_at, ply, time_control,
               white_elo_before, black_elo_before,
               white:users!matches_white_id_fkey(ai_level), black:users!matches_black_id_fkey(ai_level)`)
      .eq('id', matchId).maybeSingle<GameRow>();
    if (error) throw error;
    if (!m) return null;
    return {
      id: m.id, whiteId: m.white_id, blackId: m.black_id, status: m.status, result: m.result,
      endReason: m.end_reason, endedAt: m.ended_at ? new Date(m.ended_at) : null, ply: m.ply, timeControl: m.time_control,
      whiteEloBefore: m.white_elo_before, blackEloBefore: m.black_elo_before,
      whiteAi: m.white?.ai_level ?? null, blackAi: m.black?.ai_level ?? null,
    };
  }

  async moves(matchId: string): Promise<StoredMove[]> {
    const { data, error } = await supabaseAdmin.from('match_moves')
      .select('ply, uci, san, fen_after, white_ms, black_ms').eq('match_id', matchId).order('ply');
    if (error) throw error;
    return ((data ?? []) as MoveRow[]).map(r => ({ ply: r.ply, uci: r.uci, san: r.san, fenAfter: r.fen_after, whiteMs: r.white_ms, blackMs: r.black_ms }));
  }

  async eloOf(userId: string): Promise<number> {
    const { data, error } = await supabaseAdmin.from('users').select('elo_rating').eq('id', userId).maybeSingle<{ elo_rating: number }>();
    if (error) throw error;
    if (!data) throw new UnauthorizedError();                                // el usuario de la sesión ya no existe (#127)
    return data.elo_rating;
  }
}
