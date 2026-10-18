import type { Object3D } from 'three';

export const ease = {
  out: (t: number) => 1 - (1 - t) ** 3,
  inOut: (t: number) => (t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  bounce: (t: number) => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375;
    return n * (t -= 2.625 / d) * t + .984375;
  },
};

type V = { x: number; y: number; z: number };
type T = { obj: Object3D; from: V; to: V; t0: number; dur: number; hop: number; ease: (t: number) => number; scale?: [number, number]; rotZ?: [number, number]; done?: () => void };
export type TweenOpts = { dur: number; delay?: number; hop?: number; ease?: (t: number) => number; scaleTo?: number; rotZTo?: number; done?: () => void };

export class Tweens {
  private list: T[] = [];
  onStart?: () => void;
  // instant = reducir movimiento: todo salta al estado final en el siguiente frame
  constructor(private instant: boolean) {}

  /** Mueve un objeto (con salto opcional en arco). Reemplaza cualquier animación previa del mismo objeto. */
  to(obj: Object3D, to: Partial<V>, o: TweenOpts) {
    this.list = this.list.filter(t => t.obj !== obj);
    const p = obj.position;
    this.list.push({
      obj, from: { x: p.x, y: p.y, z: p.z }, to: { x: to.x ?? p.x, y: to.y ?? p.y, z: to.z ?? p.z },
      t0: performance.now() + (this.instant ? 0 : o.delay ?? 0), dur: this.instant ? 0 : o.dur,
      hop: this.instant ? 0 : o.hop ?? 0, ease: o.ease ?? ease.inOut,
      scale: o.scaleTo !== undefined ? [obj.scale.x, o.scaleTo] : undefined,
      rotZ: o.rotZTo !== undefined ? [obj.rotation.z, o.rotZTo] : undefined, done: o.done,
    });
    this.onStart?.();
  }

  /** Avanza todas; devuelve true si queda alguna activa. */
  update(now: number): boolean {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const t = this.list[i]!;
      const k = t.dur <= 0 ? 1 : Math.min(1, (now - t.t0) / t.dur);
      if (k < 0) continue;
      const e = t.ease(k), p = t.obj.position;
      p.set(t.from.x + (t.to.x - t.from.x) * e, t.from.y + (t.to.y - t.from.y) * e + Math.sin(Math.PI * k) * t.hop, t.from.z + (t.to.z - t.from.z) * e);
      if (t.scale) t.obj.scale.setScalar(Math.max(.001, t.scale[0] + (t.scale[1] - t.scale[0]) * e));
      if (t.rotZ) t.obj.rotation.z = t.rotZ[0] + (t.rotZ[1] - t.rotZ[0]) * e;
      if (k >= 1) { this.list.splice(i, 1); t.done?.(); }
    }
    return this.list.length > 0;
  }

  clear() { this.list = []; }
}
