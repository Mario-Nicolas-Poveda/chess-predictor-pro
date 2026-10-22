import type { MovePicker } from '@/modules/arena/domain/MovePicker';
import { chooseMove } from '../domain/search';
import type { AiLevel } from './dto/aiSchemas';

// la arena pide jugadas por el puerto MovePicker; cambiar de motor solo toca esta clase
export class EngineMovePicker implements MovePicker {
  constructor(private readonly rng: () => number = Math.random) {}

  pick({ fen }: { fen: string }, level: AiLevel): string {
    const r = chooseMove(fen, level, this.rng);
    if (!r) throw new Error('AI_NO_MOVES');   // no debería pasar: sin jugadas la partida ya terminó
    return r.uci;
  }
}
