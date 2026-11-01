import { describe, expect, it, vi } from 'vitest';
import { coalesce } from '../coalesce';

/** Un `run` que queda en vuelo hasta que el test lo suelta. */
function held() {
  const open: (() => void)[] = [], fails: boolean[] = [];
  const run = vi.fn(() => new Promise<void>((ok, no) => {
    open.push(() => (fails.shift() ? no(new Error('red')) : ok()));
  }));
  const release = async () => { open.shift()!(); await new Promise(r => setTimeout(r)); };
  return { run, release, fails };
}

describe('coalesce', () => {
  it('el timbre suena 3 veces con una consulta en vuelo → 2 consultas', async () => {
    const { run, release } = held(), c = coalesce(run);
    void c.trigger(); void c.trigger(); void c.trigger(); void c.trigger();
    expect(run).toHaveBeenCalledTimes(1);
    await release();
    expect(run).toHaveBeenCalledTimes(2);
    await release();
    expect(run).toHaveBeenCalledTimes(2);
    expect(c.busy).toBe(false);
  });

  it('un pedido durante la repetición suma otra más', async () => {
    const { run, release } = held(), c = coalesce(run);
    void c.trigger(); void c.trigger();
    await release();
    void c.trigger();
    await release();
    expect(run).toHaveBeenCalledTimes(3);
    await release();
    expect(c.busy).toBe(false);
  });

  it('si la consulta falla, el pedido pendiente igual corre y el error llega a onError', async () => {
    const { run, release, fails } = held(), onError = vi.fn(), c = coalesce(run, onError);
    fails.push(true);
    void c.trigger(); void c.trigger();
    await release();
    expect(onError).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledTimes(2);
    await release();
    expect(c.busy).toBe(false);
  });

  it('después de stop no corre nada más', async () => {
    const { run, release } = held(), c = coalesce(run);
    void c.trigger(); void c.trigger();
    c.stop();
    await release();
    void c.trigger();
    expect(run).toHaveBeenCalledTimes(1);
    expect(c.busy).toBe(false);
  });
});
