// elige la jugada (uci) de un bot tras history; el motor de IA del Sprint 4 la reemplaza
export interface MovePicker {
  pick(history: string[]): string;
}
