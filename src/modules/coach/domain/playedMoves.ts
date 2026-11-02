import type { PlayedMove } from './types';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Fila de match_moves (Sprint 3): la posición y los relojes DESPUÉS de la jugada. */
export interface StoredMove { ply: number; uci: string; san: string; fenAfter: string; whiteMs: number; blackMs: number }

/** Jugadas guardadas → jugadas con la posición de ANTES (lo que analiza el motor) y el reloj de quien movió. */
export function toPlayedMoves(moves: StoredMove[], untimed: boolean): PlayedMove[] {
  const sorted = [...moves].sort((a, b) => a.ply - b.ply);
  sorted.forEach((m, i) => { if (m.ply !== i + 1) throw new Error(`Falta la jugada ${i + 1}`); });
  return sorted.map((m, i) => ({
    ply: m.ply, uci: m.uci, san: m.san,
    fenBefore: i === 0 ? START_FEN : sorted[i - 1]!.fenAfter,
    msLeft: untimed ? null : m.ply % 2 === 1 ? m.whiteMs : m.blackMs,
  }));
}

/** Reloj inicial por ritmo (igual que arena_base_ms). null = sin reloj. */
export const initialMsOf = (tc: string): number | null =>
  tc === 'none' ? null : tc === '3+2' ? 180_000 : tc === '5+0' ? 300_000 : 600_000;
