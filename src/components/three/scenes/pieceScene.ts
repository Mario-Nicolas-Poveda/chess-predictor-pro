import type { Color, Group, Material } from 'three';
import { createPiece, geosAsync, pieceMaterials, srgb, surface, type PieceType } from '../kit';
import { createStage } from '../stage';
import { ease } from '../tween';
import type { SceneFactory } from '../useThreeScene';

export type PieceMaterial = 'w' | 'b' | 'a';
export type PedestalTheme = { tileL: string; tileD: string; frame: string; dark: boolean };
export interface PieceScene {
  /** Cambia la pieza con una caída con rebote (900 ms). */
  setPiece(type: PieceType, material: PieceMaterial): void;
  setTheme(t: PedestalTheme, accentHex: string): void;
  dispose(): void;
}

const AUTO_SPIN = .006;   // rad por frame de 16 ms
const TILE = .66;

export const createPieceScene: SceneFactory<PieceScene> = async (canvas, { quality: pre, reducedMotion, signal }) => {
  const stage = await createStage(canvas, { quality: pre, reducedMotion, signal, fov: 30, continuous: true });
  const { THREE, scene, camera, tweens, hemi, key, quality } = stage;
  await geosAsync(quality, stage.step);
  // lo bastante lejos para que la cruz del rey y las esquinas del pedestal no se corten al girar
  camera.position.set(0, 2.9, 8.4);
  camera.lookAt(0, 1, 0);
  const back = new THREE.DirectionalLight(0xdfe6ff, .5);
  back.position.set(-3, 4, -6);
  scene.add(back);

  // pedestal de 3×3 casillas con marco; todo gira junto
  const spin = new THREE.Group();
  scene.add(spin);
  const light = surface(quality, { roughness: .6 }), darkTile = surface(quality, { roughness: .6 });
  const frameMat = surface(quality, { roughness: .5 });
  const tile = new THREE.BoxGeometry(TILE, .1, TILE);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const t = new THREE.Mesh(tile, (r + c) % 2 === 0 ? light : darkTile);
    t.position.set((c - 1) * TILE, -.05, (r - 1) * TILE); t.receiveShadow = true; spin.add(t);
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, .22, 2.2), frameMat);
  frame.position.y = -.17; frame.castShadow = frame.receiveShadow = true; spin.add(frame);

  const mats: Record<PieceMaterial, Material & { color: Color }> = {
    ...pieceMaterials(quality),
    a: surface(quality, { roughness: .32, clearcoat: .6, clearcoatRoughness: .2 }),
  };
  let piece: Group | null = null;
  let current = '';
  let bobbing = false;   // vaivén solo cuando terminó la caída

  // giro: automático, arrastre con inercia que vuelve a la velocidad automática
  let velocity = reducedMotion ? 0 : AUTO_SPIN, dragging = false, lastX = 0;
  const idleSpeed = reducedMotion ? 0 : AUTO_SPIN;
  stage.onFrame((now, dt) => {
    const k = dt / 16;
    if (!dragging) {
      velocity = idleSpeed + (velocity - idleSpeed) * .97 ** k;
      spin.rotation.y += velocity * k;
    }
    if (piece && bobbing && !reducedMotion) piece.position.y = Math.sin(now / 900) * .03;
    return dragging || Math.abs(velocity - idleSpeed) > 1e-4;
  });

  const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; stage.invalidate(); };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    spin.rotation.y += dx * .012; velocity = dx * .012;
    stage.invalidate();
  };
  const onUp = (e: PointerEvent) => { dragging = false; canvas.releasePointerCapture?.(e.pointerId); canvas.style.cursor = 'grab'; stage.invalidate(); };
  // compila los tres materiales antes de mostrar la pieza (si no, el primer setPiece bloquearía)
  const warm = (['w', 'b', 'a'] as const).map(m => createPiece('p', mats[m], quality));
  spin.add(...warm);
  await stage.finish();
  spin.remove(...warm);

  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'pan-y';   // no bloquea el scroll vertical en móvil
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  return {
    setPiece(type, material) {
      const id = type + material;
      if (id === current) return;
      current = id;
      if (piece) spin.remove(piece);
      piece = createPiece(type, mats[material], quality, 1);
      piece.scale.setScalar(2.2);
      spin.add(piece);
      piece.position.y = reducedMotion ? 0 : 3.2;
      bobbing = false;
      tweens.to(piece, { y: 0 }, { dur: 900, ease: ease.bounce, done: () => { bobbing = true; } });
    },
    setTheme(t, accent) {
      light.color.copy(srgb(t.tileL)); darkTile.color.copy(srgb(t.tileD)); frameMat.color.copy(srgb(t.frame));
      mats.a.color.copy(srgb(accent));
      hemi.intensity = t.dark ? .45 : .85;
      key.intensity = t.dark ? 2.2 : 1.6;
      stage.invalidate();
    },
    dispose() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      Object.values(mats).forEach(mt => mt.dispose());   // las piezas fuera de la escena no las libera disposeTree
      stage.dispose();
    },
  };
};
