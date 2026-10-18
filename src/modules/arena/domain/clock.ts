import type { Color } from '../infrastructure/dto/arenaSchemas';

export interface ClockState { ply: number; whiteMs: number; blackMs: number; incrementMs: number; turnStartedAt: Date | null }

// relojes tras la jugada de mover; la primera jugada de las blancas no gasta tiempo. flagged = se le acabó antes de jugar
export function clocksAfterMove(m: ClockState, mover: Color, now: Date) {
  let { whiteMs, blackMs } = m;
  if (m.ply === 0 || !m.turnStartedAt) return { whiteMs, blackMs, flagged: false };
  const left = (mover === 'white' ? whiteMs : blackMs) - (now.getTime() - m.turnStartedAt.getTime());
  if (left <= 0) return { whiteMs, blackMs, flagged: true };
  if (mover === 'white') whiteMs = left + m.incrementMs; else blackMs = left + m.incrementMs;
  return { whiteMs, blackMs, flagged: false };
}
