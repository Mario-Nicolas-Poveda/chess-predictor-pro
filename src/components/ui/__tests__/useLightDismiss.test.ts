import { describe, expect, it, vi } from 'vitest';
import { bindLightDismiss } from '../useLightDismiss';

// un <dialog> de mentira: caja de 100,100 a 300,300
function setup() {
  const d = Object.assign(new EventTarget(), { getBoundingClientRect: () => ({ left: 100, right: 300, top: 100, bottom: 300 }) });
  const onDismiss = vi.fn();
  const off = bindLightDismiss(d, onDismiss);
  const fire = (type: string, x: number, y: number, target: EventTarget = d) => {
    const e = Object.assign(new Event(type, { cancelable: true }), { clientX: x, clientY: y });
    if (target === d) d.dispatchEvent(e);
    else { Object.defineProperty(e, 'target', { value: target }); d.dispatchEvent(e); }
    return e;
  };
  const tap = (x: number, y: number, target?: EventTarget) => { fire('pointerdown', x, y, target); fire('click', x, y, target); };
  return { d, onDismiss, off, fire, tap };
}

describe('useLightDismiss', () => {
  it('clic fuera de la caja cierra', () => {
    const t = setup(); t.tap(20, 20);
    expect(t.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('clic en el relleno del diálogo no cierra', () => {
    const t = setup(); t.tap(110, 110);
    expect(t.onDismiss).not.toHaveBeenCalled();
  });

  it('clic en el contenido no cierra aunque caiga fuera de la caja', () => {
    const t = setup(); t.tap(20, 20, new EventTarget());
    expect(t.onDismiss).not.toHaveBeenCalled();
  });

  it('pointerdown dentro y click fuera no cierra', () => {
    const t = setup(); t.fire('pointerdown', 150, 150); t.fire('click', 20, 20);
    expect(t.onDismiss).not.toHaveBeenCalled();
  });

  it('Esc cierra por onDismiss y evita el cierre a secas', () => {
    const t = setup(); const e = t.fire('cancel', 0, 0);
    expect(t.onDismiss).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
  });

  it('desconectado no hace nada', () => {
    const t = setup(); t.off(); t.tap(20, 20); t.fire('cancel', 0, 0);
    expect(t.onDismiss).not.toHaveBeenCalled();
  });
});
