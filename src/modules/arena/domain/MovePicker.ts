import type { AiLevel, AiMoveResult } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';

// el motor visto desde la arena. Las jugadas van en uci; el SAN lo pone GameRules
export interface MovePicker {
  /** La jugada (uci) de la IA en esa posición y nivel. Solo se llama si hay jugadas legales. */
  pick(position: { fen: string }, level: AiLevel): string;
  /** La jugada con sus datos de búsqueda; null si no hay jugadas (mate o ahogado). */
  suggest(fen: string, level: AiLevel): Omit<AiMoveResult, 'san'> | null;
  /** Ventaja de blancas (0 a 1) y las 3 jugadas más probables. */
  predict(fen: string, ms: number): { white: number; top: { uci: string; pct: number }[]; depth: number };
}
