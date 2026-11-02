import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { watchFlag } from '../game/flagWatch';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

const answers = (...status: string[]) => {
  let i = 0;
  return vi.fn(async () => ({ status: status[Math.min(i++, status.length - 1)]! }));
};

describe('watchFlag', () => {
  it('el servidor cierra al 3.er intento → 3 consultas', async () => {
    const refresh = answers('active', 'active', 'finished');
    watchFlag({ refresh });
    await vi.runAllTimersAsync();
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it('consulta ya y reintenta cada 500 ms', async () => {
    const refresh = answers('active');
    watchFlag({ refresh });
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(499);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('nunca cierra → se rinde a los 5', async () => {
    const refresh = answers('active');
    watchFlag({ refresh });
    await vi.runAllTimersAsync();
    expect(refresh).toHaveBeenCalledTimes(5);
  });

  it('cancelado al desmontar no sigue', async () => {
    const refresh = answers('active');
    const stop = watchFlag({ refresh });
    await vi.advanceTimersByTimeAsync(0);
    stop();
    await vi.runAllTimersAsync();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('sin red reintenta igual', async () => {
    const refresh = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue({ status: 'finished' });
    watchFlag({ refresh });
    await vi.runAllTimersAsync();
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
