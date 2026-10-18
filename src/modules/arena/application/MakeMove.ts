import { ConflictError } from '@/core/shared/errors/AppError';
import type { PlayerDirectory } from '@/modules/matchmaking/domain/PlayerDirectory';
import type { ArenaRepository } from '../domain/ArenaRepository';
import { clocksAfterMove } from '../domain/clock';
import type { GameRules } from '../domain/GameRules';
import { turnOf } from '../domain/Match';
import { matchFinished, stalePly } from '../domain/errors';
import type { MakeMoveInput } from '../infrastructure/dto/arenaSchemas';
import { settleOwn, stateOf } from './GetGameState';

export class MakeMove {
  constructor(private repo: ArenaRepository, private players: PlayerDirectory, private rules: GameRules) {}

  async execute(userId: string, id: string, { uci, ply }: MakeMoveInput) {
    const { m, color } = await settleOwn(this.repo, userId, id);
    if (m.status === 'finished') throw matchFinished();
    if (m.status === 'aborted') throw new ConflictError('MATCH_ABORTED', 'La partida se canceló');
    if (ply !== m.ply) throw stalePly(m.ply);
    if (turnOf(m.ply) !== color) throw new ConflictError('NOT_YOUR_TURN', 'No es tu turno');
    const played = this.rules.play((await this.repo.listMoves(id)).map(x => x.uci), uci);   // 422 si es ilegal
    const clock = clocksAfterMove(m, color, new Date());
    if (clock.flagged) {
      await this.repo.settle(id);   // se le acabó después del primer settle: este la cierra por tiempo
      throw matchFinished('timeout');
    }
    const next = await this.repo.commitMove({ matchId: id, expectedPly: ply, mover: color, uci, san: played.san,
      fen: played.fen, whiteMs: clock.whiteMs, blackMs: clock.blackMs, outcome: played.outcome });
    // sin GetGameState: ahí jugará el bot (Fase 5), y la jugada de un bot no debe volver a dispararlo
    return { ply: next, state: await stateOf(this.repo, this.players, await this.repo.findMatch(id), color, next - 1) };
  }
}
