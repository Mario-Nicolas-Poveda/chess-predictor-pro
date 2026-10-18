import { describe, expect, it } from 'vitest';
import { clocksAfterMove, type ClockState } from '../clock';

const t0 = new Date('2026-10-20T15:00:00Z');
const after = (ms: number) => new Date(t0.getTime() + ms);
const clock = (s: Partial<ClockState> = {}): ClockState =>
  ({ ply: 2, whiteMs: 600_000, blackMs: 600_000, incrementMs: 0, turnStartedAt: t0, ...s });

describe('clocksAfterMove', () => {
  it('la primera jugada de las blancas no gasta tiempo', () => {
    expect(clocksAfterMove(clock({ ply: 0, turnStartedAt: null }), 'white', after(9_000)))
      .toEqual({ whiteMs: 600_000, blackMs: 600_000, flagged: false });
  });

  it('gastar 4 s con 600 000 deja 596 000', () => {
    expect(clocksAfterMove(clock(), 'white', after(4_000))).toEqual({ whiteMs: 596_000, blackMs: 600_000, flagged: false });
  });

  it('con 3+2 se suman 2 000 tras jugar', () => {
    expect(clocksAfterMove(clock({ ply: 3, blackMs: 180_000, incrementMs: 2_000 }), 'black', after(4_000)))
      .toMatchObject({ blackMs: 178_000, flagged: false });
  });

  it('gastar más de lo que queda → flagged', () => {
    expect(clocksAfterMove(clock({ whiteMs: 3_000 }), 'white', after(4_000))).toMatchObject({ flagged: true });
  });
});
