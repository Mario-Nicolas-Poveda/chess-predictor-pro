import { ForbiddenError, UnprocessableError, ValidationError } from '@/core/shared/errors/AppError';
import type { AiLevel, AiMoveResult } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import type { ArenaRepository } from '../domain/ArenaRepository';
import type { GameRules } from '../domain/GameRules';
import type { MovePicker } from '../domain/MovePicker';

const board = (fen: string) => fen.split(' ')[0];

export class SuggestMove {
  constructor(private repo: ArenaRepository, private rules: GameRules, private engine: MovePicker,
              private limit: (key: string) => Promise<void>) {}

  async execute(userId: string, fen: string, level: AiLevel): Promise<AiMoveResult> {
    await this.limit(`ai-move:${userId}`);
    if (!this.rules.isValidFen(fen)) throw new ValidationError('Datos inválidos', { fen: ['No es una posición posible'] });
    // antitrampa: solo se comparan las piezas, así cambiar el turno o los contadores del FEN no lo salta
    const live = await this.repo.openRatedMatch(userId);
    if (live && board(live.fen) === board(fen))
      throw new ForbiddenError('LIVE_GAME_ANALYSIS', 'No puedes pedir jugadas de una partida con ELO que estás jugando');
    const r = this.engine.suggest(fen, level);
    if (!r) throw new UnprocessableError('GAME_OVER', 'En esa posición no hay jugadas: la partida terminó');
    return { ...r, san: this.rules.sanAt(fen, r.uci) };
  }
}
