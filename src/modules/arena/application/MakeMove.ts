import { ConflictError } from '@/core/shared/errors/AppError';
import type { PlayerDirectory } from '@/modules/matchmaking/domain/PlayerDirectory';
import type { AiPlayers } from '../domain/AiPlayers';
import type { ArenaRepository } from '../domain/ArenaRepository';
import { clocksAfterMove } from '../domain/clock';
import type { GameRules } from '../domain/GameRules';
import { turnOf } from '../domain/Match';
import { matchFinished, stalePly } from '../domain/errors';
import type { MakeMoveInput } from '../infrastructure/dto/arenaSchemas';
import { settleOwn, stateOf } from './GetGameState';

export class MakeMove {
  constructor(private repo: ArenaRepository, private players: PlayerDirectory, private ai: AiPlayers, private rules: GameRules) {}

  async execute(userId: string, id: string, { uci, ply }: MakeMoveInput) {
    const { m, color } = await settleOwn(this.repo, userId, id);
    if (m.status === 'finished') throw matchFinished();
    if (m.status === 'aborted') throw new ConflictError('MATCH_ABORTED', 'La partida se canceló');
    if (ply !== m.ply) throw stalePly(m.ply);
    if (turnOf(m.ply) !== color) throw new ConflictError('NOT_YOUR_TURN', 'No es tu turno');
    const played = this.rules.play((await this.repo.listMoves(id)).map(x => x.uci), uci);   // 422 si es ilegal
    const clock = clocksAfterMove({ ...m, untimed: m.timeControl === 'none' }, color, new Date());
    if (clock.flagged) {
      await this.repo.settle(id);   // se le acabó después del primer settle: este la cierra por tiempo
      throw matchFinished('timeout');
    }
    const next = await this.repo.commitMove({ matchId: id, expectedPly: ply, mover: color, uci, san: played.san,
      fen: played.fen, whiteMs: clock.whiteMs, blackMs: clock.blackMs, outcome: played.outcome });
    // sin GetGameState: la respuesta de la IA la dispara la ruta (PlayAiTurn llama aquí y no a la ruta)
    return { ply: next, state: await stateOf(this.repo, this.players, this.ai, await this.repo.findMatch(id), color, next - 1) };
  }
}
