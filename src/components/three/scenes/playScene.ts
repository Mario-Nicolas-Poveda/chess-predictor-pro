import type { Group } from 'three';
import { createBoard, createPiece, geosAsync, lux, pieceMaterials, squareToXZ, srgb, type PieceType } from '../kit';
import { createStage } from '../stage';
import { ease } from '../tween';
import type { SceneFactory } from '../useThreeScene';

export type PlayPhase = 'lobby' | 'searching' | 'matched' | 'arena';
export interface PlayScene {
  setPhase(phase: PlayPhase): void;
  /** ±100…±400 del servidor: las ondas llegan más lejos cuanto más se amplía el rango. */
  setRange(halfWidth: number): void;
  dispose(): void;
}

// Cámara por fase: radio, altura y velocidad de órbita (rad por frame de 16 ms).
const CAM: Record<PlayPhase, { r: number; h: number; speed: number }> = {
  lobby: { r: 13, h: 9, speed: .0012 },
  searching: { r: 11.5, h: 7.5, speed: .0045 },
  matched: { r: 8.6, h: 5.2, speed: .0008 },
  arena: { r: 12.5, h: 9.5, speed: 0 },
};
const BACK: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
const FILES = 'abcdefgh';
const KNIGHT_JUMPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]] as const;

export const createPlayScene: SceneFactory<PlayScene> = async (canvas, { quality: pre, reducedMotion, signal }) => {
  const stage = await createStage(canvas, { quality: pre, reducedMotion, signal, fov: 32 });
  const { THREE, scene, camera, tweens, quality } = stage;
  await geosAsync(quality, stage.step);
  scene.add(createBoard({ light: '#efe4d3', dark: '#c9b08e', frame: '#4a2c24' }, quality).group);
  await stage.step();

  const mats = pieceMaterials(quality);
  const place = (g: Group, sq: string) => { const p = squareToXZ(sq); g.position.set(p.x, 0, p.z); return g; };
  const wk = place(createPiece('k', mats.w, quality, 1), 'e1');
  const bk = place(createPiece('k', mats.b, quality, -1), 'e8');
  const kn = createPiece('n', mats.w, quality, 1);
  kn.visible = false;
  scene.add(wk, bk, kn);

  // las 30 piezas restantes, ocultas hasta la fase arena; en tandas de 8 para no bloquear
  const army: Group[] = [];
  for (let f = 0; f < 8; f++) {
    for (const [rank, type, color] of [[1, BACK[f]!, 'w'], [2, 'p', 'w'], [7, 'p', 'b'], [8, BACK[f]!, 'b']] as const) {
      if (type === 'k') continue;
      const g = place(createPiece(type, mats[color], quality, color === 'w' ? 1 : -1), FILES[f]! + rank);
      g.userData.home = g.position.clone(); g.visible = false;
      scene.add(g); army.push(g);
      if (army.length % 8 === 0) await stage.step();
    }
  }

  const glow = new THREE.PointLight(0xc04a5c, 0, 9, 1.6);   // la intensidad se anima en el destello (con lux)
  glow.position.set(0, 1.6, 0); scene.add(glow);

  const ringMat = new THREE.MeshBasicMaterial({ color: srgb('#6e1e2b'), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const rings = [0, 1].map(() => {
    const m = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 64), ringMat.clone());
    m.rotation.x = -Math.PI / 2; m.position.y = .02; m.visible = false; scene.add(m); return m;
  });
  ringMat.dispose();

  let phase: PlayPhase | null = null, phaseT0 = 0, range = 100;
  let knightTimer: ReturnType<typeof setInterval> | undefined;
  let knightSq = { f: 3, r: 4 };
  const cam = { ...CAM.lobby, a: .6 }, target = { ...CAM.lobby };

  const hopKnight = () => {
    const options = KNIGHT_JUMPS.map(([df, dr]) => ({ f: knightSq.f + df, r: knightSq.r + dr })).filter(s => s.f >= 0 && s.f < 8 && s.r >= 2 && s.r <= 7);
    const next = options[Math.floor(Math.random() * options.length)];
    if (!next) return;
    knightSq = next;
    const p = squareToXZ(FILES[next.f]! + next.r);
    kn.rotation.y = Math.atan2(-(p.z - kn.position.z), p.x - kn.position.x);   // la cabeza mira hacia donde salta
    tweens.to(kn, { x: p.x, y: 0, z: p.z }, { dur: 560, hop: 1.2 });
  };
  const kingsHome = (dur: number, hop: number) => {
    const e1 = squareToXZ('e1'), e8 = squareToXZ('e8');
    tweens.to(wk, { x: e1.x, y: 0, z: e1.z }, { dur, hop });
    tweens.to(bk, { x: e8.x, y: 0, z: e8.z }, { dur, hop });
  };

  stage.onFrame((now, dt) => {
    const since = now - phaseT0;
    let busy = false;
    // ondas del radar: radio máximo según el rango de ELO
    const reach = 4.2 * range / 400;
    rings.forEach((r, i) => {
      if (!r.visible) return;
      const s = ((since + i * 900) % 1800) / 1800;
      r.scale.setScalar(.6 + s * reach); r.material.opacity = (1 - s) * .55; busy = true;
    });
    // destello al encontrar rival: 0 → 3 en 600 ms y baja a 0,8
    if (phase === 'matched' && since < 1400) {
      glow.intensity = lux(1.5 * (since < 600 ? (since / 600) * 3 : 3 - ((since - 600) / 800) * 2.2)); busy = true;   // ×1,5: compensa la caída física a 1,6 de distancia
    }
    // cámara: se acerca a la de la fase; con reducir movimiento salta y no orbita
    const k = reducedMotion ? 1 : .04;
    cam.r += (target.r - cam.r) * k; cam.h += (target.h - cam.h) * k; cam.speed += (target.speed - cam.speed) * .05;
    if (!reducedMotion) cam.a += cam.speed * (dt / 16);
    if (Math.abs(target.r - cam.r) + Math.abs(target.h - cam.h) > .01) busy = true;
    const fit = Math.max(1, 1.02 / camera.aspect);   // que el tablero quepa también en pantallas verticales
    camera.position.set(Math.sin(cam.a) * cam.r * fit, cam.h * fit, Math.cos(cam.a) * cam.r * fit);
    camera.lookAt(0, 0, 0);
    return busy;
  });

  await stage.finish();
  return {
    setPhase(next) {
      if (next === phase) return;
      phase = next; phaseT0 = performance.now();
      clearInterval(knightTimer); knightTimer = undefined;
      Object.assign(target, CAM[next]);
      stage.setContinuous(next !== 'arena');
      const showRings = next === 'searching' && !reducedMotion;
      rings.forEach(r => { r.visible = showRings; });
      if (next !== 'matched') glow.intensity = 0;

      if (next === 'lobby') {
        kn.visible = false;
        army.forEach(g => { g.visible = false; });
        kingsHome(700, .6);
      } else if (next === 'searching') {
        knightSq = { f: 3, r: 4 };
        const d4 = squareToXZ('d4');
        kn.visible = true; kn.scale.setScalar(1); kn.position.set(d4.x, 4, d4.z);
        tweens.to(kn, { y: 0 }, { dur: 900, ease: ease.bounce });
        if (!reducedMotion) knightTimer = setInterval(hopKnight, 900);
      } else if (next === 'matched') {
        if (kn.visible) tweens.to(kn, { y: -1.2 }, { dur: 500, hop: .3, ease: ease.out, done: () => { kn.visible = false; } });
        const d4 = squareToXZ('d4'), e5 = squareToXZ('e5');
        tweens.to(wk, { x: d4.x, y: 0, z: d4.z }, { dur: 1100, hop: 1.1, delay: 250 });
        tweens.to(bk, { x: e5.x, y: 0, z: e5.z }, { dur: 1100, hop: 1.1, delay: 400 });
      } else {
        kn.visible = false;
        kingsHome(800, .8);
        army.forEach((g, i) => {
          const home = g.userData.home as { x: number; z: number };
          g.visible = true; g.position.set(home.x, 5 + Math.random() * 2, home.z);
          tweens.to(g, { y: 0 }, { dur: 900, delay: 200 + i * 30, ease: ease.bounce });
        });
      }
      stage.invalidate();
    },
    setRange(halfWidth) { range = Math.min(400, Math.max(100, halfWidth)); },
    dispose() { clearInterval(knightTimer); stage.dispose(); },
  };
};
