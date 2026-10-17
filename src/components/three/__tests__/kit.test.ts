import { describe, expect, it } from 'vitest';
import { Object3D } from 'three';
import { squareToXZ } from '../kit';
import { Tweens } from '../tween';

describe('squareToXZ', () => {
  it('a1 queda en la esquina blanca y h8 en la negra', () => {
    expect(squareToXZ('a1')).toEqual({ x: -3.5, z: 3.5 });
    expect(squareToXZ('h8')).toEqual({ x: 3.5, z: -3.5 });
  });
});

describe('Tweens', () => {
  it('con reducir movimiento deja el objeto en el destino en una sola llamada', () => {
    const obj = new Object3D();
    let done = false;
    const t = new Tweens(true);
    t.to(obj, { x: 2, y: 1 }, { dur: 600, delay: 300, hop: 1, scaleTo: 0.5, done: () => { done = true; } });
    expect(t.update(performance.now())).toBe(false);
    expect(obj.position.toArray()).toEqual([2, 1, 0]);
    expect(obj.scale.x).toBe(0.5);
    expect(done).toBe(true);
  });

  it('una animación nueva del mismo objeto reemplaza la anterior', () => {
    const obj = new Object3D();
    const t = new Tweens(true);
    t.to(obj, { x: 5 }, { dur: 100 });
    t.to(obj, { x: 1 }, { dur: 100 });
    t.update(performance.now());
    expect(obj.position.x).toBe(1);
  });
});
