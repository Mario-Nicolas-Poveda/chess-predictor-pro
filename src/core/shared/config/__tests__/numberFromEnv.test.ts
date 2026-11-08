import { describe, expect, it, vi } from 'vitest';
import { numberFromEnv } from '../numberFromEnv';

const R = { min: 0, max: 2 };
describe('numberFromEnv', () => {
  it('un 0 escrito es 0; vacía o sin definir usa el valor por defecto', () => {
    expect(numberFromEnv('T', '0', 0.4, R)).toBe(0);
    expect(numberFromEnv('T', '', 0.4, R)).toBe(0.4);
    expect(numberFromEnv('T', undefined, 0.4, R)).toBe(0.4);
    expect(numberFromEnv('T', '0.7', 0.4, R)).toBe(0.7);
    expect(numberFromEnv('T', ' 1 ', 0.4, R)).toBe(1);
  });
  it('no numérico o fuera de rango → valor por defecto y un aviso', () => {
    for (const raw of ['abc', '3']) {
      const warn = vi.fn();
      expect(numberFromEnv('T', raw, 0.4, R, warn)).toBe(0.4);
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0]![0]).toContain('T=');
    }
  });
});
