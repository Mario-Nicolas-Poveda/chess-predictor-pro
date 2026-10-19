import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { createPiece, geosAsync, lux, pieceMaterials, srgb, surface } from '../kit';
import { createStage } from '../stage';
import { ease } from '../tween';
import type { SceneFactory } from '../useThreeScene';
import type { PedestalTheme } from './pieceScene';

export interface ResultScene {
  /** Vuelve a lanzar la animación desde el principio. */
  play(outcome: 'win' | 'loss' | 'draw', you: 'white' | 'black'): void;
  setTheme(t: PedestalTheme, accentHex: string): void;
  dispose(): void;
}

const AUTO_SPIN = .004, TILE = .7, KING = 1.4, X = .7;

/** Los dos reyes sobre un pedestal: el que pierde cae hacia atrás, el que gana salta y gira; en tablas se saludan. */
export const createResultScene: SceneFactory<ResultScene> = async (canvas, { quality: pre, reducedMotion, signal }) => {
  const stage = await createStage(canvas, { quality: pre, reducedMotion, signal, fov: 30 });
  const { THREE, scene, camera, tweens, hemi, key, quality } = stage;
  const spins = quality === 'high' && !reducedMotion;   // calidad baja: quieto, gira solo al arrastrar
  await geosAsync(quality, stage.step);
  // más lejos que (0, 3.6, 8.6): las esquinas del pedestal 5×5 se cortaban al girar en un escenario cuadrado
  camera.position.set(0, 4.3, 10.8);
  camera.lookAt(0, .55, 0);
  const back = new THREE.DirectionalLight(0xdfe6ff, lux(.5));   // contraluz frío
  back.position.set(-3, 4, -6);
  scene.add(back);

  // pedestal de 5×5 casillas con marco; todo gira junto
  const spin = new THREE.Group();
  scene.add(spin);
  const light = surface(quality, { roughness: .6 }), darkTile = surface(quality, { roughness: .6 }), frameMat = surface(quality, { roughness: .5 });
  const tile = new THREE.BoxGeometry(TILE, .1, TILE);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const t = new THREE.Mesh(tile, (r + c) % 2 === 0 ? light : darkTile);
    t.position.set((c - 2) * TILE, -.05, (r - 2) * TILE); t.receiveShadow = true; spin.add(t);
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.85, .28, 3.85), frameMat);
  frame.position.y = -.2; frame.castShadow = frame.receiveShadow = true; spin.add(frame);

  const mats = pieceMaterials(quality);
  const kings: Record<'white' | 'black', Group> = { white: createPiece('k', mats.w, quality, 1), black: createPiece('k', mats.b, quality, -1) };
  kings.white.scale.setScalar(KING); kings.black.scale.setScalar(KING);
  spin.add(kings.white, kings.black);

  const ringMat = new THREE.MeshStandardMaterial({ roughness: .4 }) as MeshStandardMaterial;
  const ring: Mesh = new THREE.Mesh(new THREE.TorusGeometry(.62, .035, 12, 64), ringMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = .02; ring.visible = false;
  spin.add(ring);

  let winner: Group | null = null, ringOn = false, timers: ReturnType<typeof setTimeout>[] = [];
  const later = (ms: number, fn: () => void) => { timers.push(setTimeout(() => { fn(); stage.invalidate(); }, reducedMotion ? 0 : ms)); };

  // giro del pedestal: automático y arrastre con inercia; el ganador gira sobre sí mismo y el aro late
  const idle = spins ? AUTO_SPIN : 0;
  let velocity = idle, dragging = false, lastX = 0;
  stage.onFrame((now, dt) => {
    const k = dt / 16;
    if (!dragging) { velocity = idle + (velocity - idle) * .97 ** k; spin.rotation.y += velocity * k; }
    if (winner && spins) winner.rotation.y += .01 * k;
    if (ringOn && !reducedMotion) ring.scale.setScalar(ring.userData.base * (1 + Math.sin(now / 420) * .06));
    return dragging || Math.abs(velocity - idle) > 1e-4;
  });
  const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; stage.invalidate(); };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    spin.rotation.y += dx * .012; velocity = dx * .012;
    stage.invalidate();
  };
  const onUp = (e: PointerEvent) => { dragging = false; canvas.releasePointerCapture?.(e.pointerId); canvas.style.cursor = 'grab'; stage.invalidate(); };

  await stage.finish();
  stage.setContinuous(spins);
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  return {
    play(outcome, you) {
      timers.forEach(clearTimeout); timers = [];
      tweens.clear();
      winner = null; ringOn = false; ring.visible = false;
      // entrada: los dos caen con rebote, el negro 120 ms después
      (['white', 'black'] as const).forEach((c, i) => {
        const g = kings[c];
        g.rotation.set(0, 0, 0);
        g.position.set(c === 'white' ? -X : X, reducedMotion ? 0 : 3.4, 0);
        tweens.to(g, { y: 0 }, { dur: 900, delay: i * 120, ease: ease.bounce });
      });
      if (outcome === 'draw') {
        // se inclinan uno hacia el otro dos veces; un aro grande queda entre los dos
        const bow = (n: number) => {
          tweens.to(kings.white, {}, { dur: 400, rotZTo: -.2, done: () => tweens.to(kings.white, {}, { dur: 400, rotZTo: 0 }) });
          tweens.to(kings.black, {}, { dur: 400, rotZTo: .2, done: () => tweens.to(kings.black, {}, { dur: 400, rotZTo: 0, done: () => { if (n > 1) bow(n - 1); } }) });
        };
        later(1500, () => { bow(2); ring.position.x = 0; ring.userData.base = 1.9; ring.scale.setScalar(1.9); ring.visible = ringOn = true; });
        return;
      }
      const won = outcome === 'win' ? you : you === 'white' ? 'black' : 'white';
      const lost = kings[won === 'white' ? 'black' : 'white'], win = kings[won];
      // el que pierde cae hacia atrás con rebote; el que gana salta y luego gira despacio
      later(1500, () => tweens.to(lost, { y: .5, z: -.45 }, { dur: 1200, ease: ease.bounce, rotXTo: -1.42 }));
      later(2300, () => {
        tweens.to(win, { y: 0 }, { dur: 700, hop: .55, ease: ease.out, done: () => { winner = win; stage.invalidate(); } });
        ring.position.x = win.position.x; ring.userData.base = 1; ring.scale.setScalar(1); ring.visible = ringOn = true;
      });
    },
    setTheme(t, accent) {
      light.color.copy(srgb(t.tileL)); darkTile.color.copy(srgb(t.tileD)); frameMat.color.copy(srgb(t.frame));
      ringMat.color.copy(srgb(accent));
      hemi.intensity = lux(t.dark ? .45 : .85);
      key.intensity = lux(t.dark ? 2.2 : 1.6);
      stage.invalidate();
    },
    dispose() {
      timers.forEach(clearTimeout);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      stage.dispose();
    },
  };
};
