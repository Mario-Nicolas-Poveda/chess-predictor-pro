import 'server-only';
import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';
import { alreadyInQueue } from '../application/JoinQueue';
import type { MatchRecord } from '../domain/Match';
import type { MatchmakingRepository } from '../domain/MatchmakingRepository';
import type { QueueEntry } from '../domain/QueueEntry';
import type { TimeControl } from './dto/matchmakingSchemas';

type EntryRow = { user_id: string; elo: number; time_control: TimeControl; is_bot: boolean; joined_at: string };
type MatchRow = { id: string; white_id: string; black_id: string; time_control: TimeControl;
  status: MatchRecord['status']; created_at: string };

const mapEntry = (r: EntryRow): QueueEntry =>
  ({ userId: r.user_id, elo: r.elo, timeControl: r.time_control, isBot: r.is_bot, joinedAt: new Date(r.joined_at) });
const mapMatch = (r: MatchRow): MatchRecord => ({ id: r.id, whiteId: r.white_id, blackId: r.black_id,
  timeControl: r.time_control, status: r.status, createdAt: new Date(r.created_at) });

export class SupabaseMatchmakingRepository implements MatchmakingRepository {
  async findEntry(userId: string) {
    const { data, error } = await supabaseAdmin.from('matchmaking_queue')
      .select('*').eq('user_id', userId).maybeSingle<EntryRow>();
    if (error) throw error;
    return data ? mapEntry(data) : null;
  }

  async enqueue(e: Omit<QueueEntry, 'joinedAt'>) {
    const { data, error } = await supabaseAdmin.from('matchmaking_queue')
      .insert({ user_id: e.userId, elo: e.elo, time_control: e.timeControl, is_bot: e.isBot })
      .select('*').single<EntryRow>();
    if (error?.code === '23505') throw alreadyInQueue();   // otra pestaña entró entre la consulta y el insert
    if (error) throw error;
    return mapEntry(data);
  }

  async dequeue(userId: string) {
    const { data, error } = await supabaseAdmin.from('matchmaking_queue')
      .delete().eq('user_id', userId).select('user_id');
    if (error) throw error;
    return data.length > 0;
  }

  async dequeueBots() {
    const { error } = await supabaseAdmin.from('matchmaking_queue').delete().eq('is_bot', true);
    if (error) throw error;
  }

  async tryPair(userId: string) {
    const { data, error } = await supabaseAdmin.rpc('mm_try_pair', { p_user: userId });
    if (error) throw error;
    return (data as string | null) ?? null;
  }

  async cleanup() {
    const { error } = await supabaseAdmin.rpc('mm_cleanup');
    if (error) throw error;
  }

  async countSearching() {
    const since = new Date(Date.now() - 15_000).toISOString();
    const { data, error } = await supabaseAdmin.from('matchmaking_queue')
      .select('time_control').or(`is_bot.eq.true,last_seen_at.gt.${since}`);
    if (error) throw error;
    const out: Record<TimeControl, number> = { '3+2': 0, '5+0': 0, '10+0': 0 };
    for (const r of data as { time_control: TimeControl }[]) out[r.time_control]++;
    return out;
  }

  async findOpenMatchFor(userId: string) {
    // antes, cerrar sus partidas vencidas (tiempo agotado, pending de > 3 min): si nadie las consulta, bloquearían la búsqueda
    const settled = await supabaseAdmin.rpc('arena_settle_user', { p_user: userId });
    if (settled.error) throw settled.error;
    // la regla de "partida abierta" vive en SQL (mm_open_match) para no duplicarla
    const { data, error } = await supabaseAdmin.rpc('mm_open_match', { p_user: userId });
    if (error) throw error;
    const row = (data as MatchRow[])[0];
    return row ? mapMatch(row) : null;
  }

  async findMatch(id: string) {
    const { data, error } = await supabaseAdmin.from('matches').select('*').eq('id', id).maybeSingle<MatchRow>();
    if (error) throw error;
    return data ? mapMatch(data) : null;
  }

  async abortIfPending(id: string) {
    // la condición va en el UPDATE: si la partida pasó a active entre la lectura y la escritura, no la toca
    const { data, error } = await supabaseAdmin.from('matches')
      .update({ status: 'aborted' }).eq('id', id).eq('status', 'pending').select('id');
    if (error) throw error;
    return data.length > 0;
  }
}
