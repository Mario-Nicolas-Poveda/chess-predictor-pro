import type { MovePicker } from '@/modules/arena/domain/MovePicker';
import { chooseMove, predict } from '../domain/search';
import type { AiLevel } from './dto/aiSchemas';

// la arena pide jugadas por el puerto MovePicker; cambiar de motor solo toca esta clase
export class EngineMovePicker implements MovePicker {
  constructor(private readonly rng: () => number = Math.random) {}

  pick({ fen }: { fen: string }, level: AiLevel): string {
    const r = this.suggest(fen, level);
    if (!r) throw new Error('AI_NO_MOVES');   // no debería pasar: sin jugadas la partida ya terminó
    return r.uci;
  }

  suggest(fen: string, level: AiLevel) {
    return chooseMove(fen, level, this.rng);
  }

  predict(fen: string, ms: number) {
    return predict(fen, ms);
  }
}
