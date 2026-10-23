import { AppError } from '@/core/shared/errors/AppError';
import { ENGINE_LEVELS } from '@/modules/ai-engine/domain/levels';
import type { AiPlayers } from '../domain/AiPlayers';
import type { ArenaRepository } from '../domain/ArenaRepository';
import { turnOf } from '../domain/Match';
import type { MovePicker } from '../domain/MovePicker';
import type { MakeMove } from './MakeMove';

export type AiTurnResult = 'played' | 'not-ai-turn' | 'busy' | 'stale';

// Sin procesos en segundo plano: lo llaman las rutas después de responder (after)
export class PlayAiTurn {
  constructor(private repo: ArenaRepository, private ai: AiPlayers, private picker: MovePicker, private makeMove: MakeMove) {}

  /** Si le toca a la IA, piensa y juega. Se puede llamar varias veces a la vez: solo una gana el permiso (ai_claim). */
  async run(matchId: string): Promise<AiTurnResult> {
    await this.repo.settle(matchId);
    const m = await this.repo.findMatch(matchId);
    if (!m || (m.status !== 'pending' && m.status !== 'active')) return 'not-ai-turn';
    const botId = turnOf(m.ply) === 'white' ? m.whiteId : m.blackId;
    const level = await this.ai.levelOf(botId);
    if (!level) return 'not-ai-turn';
    // el permiso dura lo que piensa el nivel más 5 s; después otra consulta puede reintentar
    if (!(await this.repo.claimAiTurn(matchId, m.ply, ENGINE_LEVELS[level].ms + 5000))) return 'busy';
    const uci = this.picker.pick({ fen: m.fen }, level);
    try {
      await this.makeMove.execute(botId, matchId, { uci, ply: m.ply });
      return 'played';
    } catch (e) {
      // alguien deshizo, se rindió o el tiempo se acabó mientras pensaba: no es un error
      if (e instanceof AppError && ['STALE_PLY', 'NOT_YOUR_TURN', 'MATCH_FINISHED', 'MATCH_ABORTED'].includes(e.code)) return 'stale';
      throw e;
    }
  }
}
