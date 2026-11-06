import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { afterDeadline, fmtCountdown } from '../lib/deadline';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-05T12:00:00Z')); });
afterEach(() => { vi.useRealTimers(); });

describe('afterDeadline', () => {
  it('consulta a la hora + 250 ms y reintenta cada segundo hasta que el servidor cambia', async () => {
    const answers = [false, false, true];
    const refresh = vi.fn(async () => answers.shift() ?? true);
    afterDeadline({ at: '2026-11-05T12:00:10Z', skewMs: 0, refresh });
    await vi.advanceTimersByTimeAsync(10_249);
    expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it('con el reloj del servidor adelantado 2 s, consulta 2 s antes (hora del navegador)', async () => {
    const refresh = vi.fn(async () => true);
    afterDeadline({ at: '2026-11-05T12:00:10Z', skewMs: 2000, refresh });
    await vi.advanceTimersByTimeAsync(8249);
    expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('cancelado al desmontar no consulta', async () => {
    const refresh = vi.fn(async () => true);
    const stop = afterDeadline({ at: '2026-11-05T12:00:01Z', skewMs: 0, refresh });
    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('fmtCountdown', () => {
  it('59 s · 4:32 · 1 h 05 min · 2 d 3 h', () => {
    expect(fmtCountdown(59_000)).toBe('59 s');
    expect(fmtCountdown(272_000)).toBe('4:32');
    expect(fmtCountdown(3_900_000)).toBe('1 h 05 min');
    expect(fmtCountdown((2 * 86_400 + 3 * 3600) * 1000)).toBe('2 d 3 h');
    expect(fmtCountdown(-5)).toBe('0 s');
  });
});
