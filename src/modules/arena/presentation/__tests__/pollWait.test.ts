import { describe, expect, it } from 'vitest';
import { pollWait } from '../game/pollWait';

describe('pollWait', () => {
  it('en vivo: respaldo cada 10 s como mínimo', () => {
    expect(pollWait(1500, true)).toBe(10_000);
    expect(pollWait(30_000, true)).toBe(30_000);
  });
  it('sin canal: lo que pide el servidor', () => expect(pollWait(700, false)).toBe(700));
  it('0 corta el polling, en vivo o no', () => {
    expect(pollWait(0, true)).toBe(0);
    expect(pollWait(0, false)).toBe(0);
  });
});
