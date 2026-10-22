import type { AiLevel } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';

// elige la jugada (uci) de la IA en esa posición y nivel. Solo se llama si hay jugadas legales
export interface MovePicker {
  pick(position: { fen: string }, level: AiLevel): string;
}
