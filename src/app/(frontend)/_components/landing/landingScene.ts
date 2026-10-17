import type { Group, MeshBasicMaterial } from 'three';
import { createPiece, squareToXZ, type PieceType } from '@/components/three/kit';
import { createStage } from '@/components/three/stage';
import type { SceneFactory } from '@/components/three/useThreeScene';

export interface LandingScene {
  /** Progreso del scroll 0..1: cámara, jugadas y capas. Solo dibuja cuando cambia. */
  setProgress(p: number): void;
  dispose(): void;
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const sstep = (a: number, b: number, x: number) => smooth(clamp((x - a) / (b - a)));
const ease = (t: number) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Mesa de noche con lámpara: tablero de madera procedural y la apertura Italiana jugada con el scroll. */
export const createLandingScene: SceneFactory<LandingScene> = (canvas, { quality, reducedMotion }) => {
  const dustOn = quality === 'high' && !reducedMotion;   // el polvo (y el leve vaivén de cámara) piden frames continuos
  const stage = createStage(canvas, { quality, reducedMotion, fov: 36, continuous: dustOn, lights: false });
  const { THREE, renderer, scene, camera } = stage;
  renderer.toneMappingExposure = .95;
  scene.background = new THREE.Color(0x100c09);
  scene.fog = new THREE.FogExp2(0x100c09, 0.045);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const texSize = quality === 'high' ? 1024 : 512;

  /* ---------- madera procedural ---------- */
  const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d')!;
  function grain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, vertical: boolean, base: string, dark: string, seed: number) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = base; ctx.fillRect(x, y, w, h);
    let s = seed;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const lines = Math.round((vertical ? w : h) / 3.2);
    for (let i = 0; i < lines; i++) {
      const off = (i / lines) * (vertical ? w : h) + rnd() * 3;
      const amp = 1.5 + rnd() * 4, freq = 0.004 + rnd() * 0.01, ph = rnd() * 6.28;
      ctx.strokeStyle = dark; ctx.globalAlpha = 0.04 + rnd() * 0.12; ctx.lineWidth = 0.6 + rnd() * 1.6;
      ctx.beginPath();
      const len = vertical ? h : w;
      for (let t = 0; t <= len; t += 6) {
        const d = off + Math.sin(t * freq + ph) * amp + Math.sin(t * freq * 3.1 + ph) * amp * 0.3;
        if (vertical) ctx.lineTo(x + d, y + t); else ctx.lineTo(x + t, y + d);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();
  }
  function tex(c: HTMLCanvasElement, repeat?: number) {
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
    return t;
  }
  const canvas2d = (size: number) => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
  function boardCanvas() {
    const c = canvas2d(texSize), ctx = ctx2d(c), sq = texSize / 8;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const light = (r + f) % 2 === 0;
      grain(ctx, f * sq, r * sq, sq, sq, light, light ? '#d6bd91' : '#5b3a24', light ? '#8a6a3e' : '#24140a', 17 + r * 8 + f);
    }
    ctx.strokeStyle = 'rgba(20,12,6,.35)'; ctx.lineWidth = 1.2;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(i * sq, 0); ctx.lineTo(i * sq, texSize); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * sq); ctx.lineTo(texSize, i * sq); ctx.stroke();
    }
    return c;
  }
  const FRAME = 9.4, BORDER = (FRAME - 8) / 2;
  function frameCanvas() {
    const size = texSize, c = canvas2d(size), ctx = ctx2d(c), k = size / FRAME, b = BORDER * k, sq = k;
    grain(ctx, 0, 0, size, size, false, '#2c1b10', '#0d0703', 5);
    ctx.strokeStyle = '#b8874a'; ctx.globalAlpha = .75; ctx.lineWidth = 3 * size / 1024;
    ctx.strokeRect(b - 9, b - 9, size - 2 * b + 18, size - 2 * b + 18); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(214,170,110,.82)';
    ctx.font = `500 ${Math.round(30 * size / 1024)}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-cormorant') || 'Georgia'}, Georgia, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 8; i++) {
      const file = 'abcdefgh'[i]!, cx = b + (i + .5) * sq, cy = b + (7 - i + .5) * sq;
      ctx.fillText(file, cx, size - b / 2 + 2);
      ctx.save(); ctx.translate(cx, b / 2); ctx.rotate(Math.PI); ctx.fillText(file, 0, 0); ctx.restore();
      ctx.fillText(String(i + 1), b / 2, cy);
      ctx.save(); ctx.translate(size - b / 2, cy); ctx.rotate(Math.PI); ctx.fillText(String(i + 1), 0, 0); ctx.restore();
    }
    return c;
  }
  function plainWood(base: string, dark: string, seed: number) {
    const c = canvas2d(512); grain(ctx2d(c), 0, 0, 512, 512, false, base, dark, seed); return c;
  }

  /* ---------- tablero y mesa ---------- */
  const frameMat = new THREE.MeshStandardMaterial({ map: tex(plainWood('#2c1b10', '#0d0703', 9)), roughness: .55 });
  const frameTopMat = new THREE.MeshPhysicalMaterial({ map: tex(frameCanvas()), roughness: .45, clearcoat: .5, clearcoatRoughness: .35 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(FRAME, .42, FRAME), [frameMat, frameMat, frameTopMat, frameMat, frameMat, frameMat]);
  frame.position.y = -.21; frame.receiveShadow = frame.castShadow = true; scene.add(frame);
  const play = new THREE.Mesh(new THREE.PlaneGeometry(8, 8),
    new THREE.MeshPhysicalMaterial({ map: tex(boardCanvas()), roughness: .42, clearcoat: .55, clearcoatRoughness: .3 }));
  play.rotation.x = -Math.PI / 2; play.position.y = .002; play.receiveShadow = true; scene.add(play);
  const table = new THREE.Mesh(new THREE.CircleGeometry(40, 64),
    new THREE.MeshStandardMaterial({ map: tex(plainWood('#1f140c', '#080402', 3), 6), roughness: .8 }));
  table.rotation.x = -Math.PI / 2; table.position.y = -.42; table.receiveShadow = true; scene.add(table);

  /* ---------- luces ---------- */
  scene.add(new THREE.HemisphereLight(0x6b5642, 0x0a0705, .38));
  const spot = new THREE.SpotLight(0xffc88a, 2.05, 34, .82, .75, 1.4);
  spot.position.set(0, 7.25, 0); spot.target.position.set(0, 0, 0);
  const sm = quality === 'high' ? 1024 : 512;
  spot.castShadow = true; spot.shadow.mapSize.set(sm, sm); spot.shadow.bias = -.0004; spot.shadow.normalBias = .02;
  spot.shadow.camera.near = 2; spot.shadow.camera.far = 14;
  scene.add(spot, spot.target);
  const rim = new THREE.DirectionalLight(0x8aa2c8, .42); rim.position.set(-9, 5, -11);
  const fill = new THREE.DirectionalLight(0xffb070, .22); fill.position.set(9, 3, 9);
  scene.add(rim, fill);

  /* lámpara colgante */
  const lamp = new THREE.Group();
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0x2a1f16, metalness: .75, roughness: .38, side: THREE.DoubleSide, transparent: true });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(.22, 1.05, .85, 48, 1, true), shadeMat); shade.position.y = 7.75;
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe3b4, transparent: true });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.17, 24, 16), bulbMat); bulb.position.y = 7.4;
  const cordMat = new THREE.MeshBasicMaterial({ color: 0x0c0907, transparent: true });
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, 14, 6), cordMat); cord.position.y = 15.1;
  const glowC = canvas2d(128);
  {
    const g = ctx2d(glowC), rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, 'rgba(255,214,150,.9)'); rg.addColorStop(.25, 'rgba(255,180,100,.28)'); rg.addColorStop(1, 'rgba(255,160,80,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  }
  const glowMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowC), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const glow = new THREE.Sprite(glowMat); glow.scale.set(2.6, 2.6, 1); glow.position.y = 7.3;
  lamp.add(shade, bulb, cord, glow); scene.add(lamp);

  /* polvo en el cono de luz (solo calidad alta) */
  const DUST = dustOn ? 420 : 0;
  const dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 4.2;
    dustPos[i * 3] = Math.cos(a) * r; dustPos[i * 3 + 1] = .3 + Math.random() * 6.6; dustPos[i * 3 + 2] = Math.sin(a) * r; dustSeed[i] = Math.random() * 100;
  }
  const dustAttr = new THREE.BufferAttribute(dustPos, 3);
  if (DUST) {
    const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', dustAttr);
    scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffd7a0, size: .035, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })));
  }

  /* ---------- piezas del kit, con el marfil y el ébano de la landing ---------- */
  const ivory = new THREE.MeshPhysicalMaterial({ color: 0xeee2c8, roughness: .32, clearcoat: .5, clearcoatRoughness: .25 });
  const ebony = new THREE.MeshPhysicalMaterial({ color: 0x1c1512, roughness: .28, clearcoat: .75, clearcoatRoughness: .18 });
  const sq = (name: string) => { const { x, z } = squareToXZ(name); return new THREE.Vector3(x, 0, z); };
  const pieces: Record<string, Group> = {};
  const BACK: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let f = 0; f < 8; f++) {
    const file = 'abcdefgh'[f]!;
    for (const [rank, type, white] of [[1, BACK[f]!, true], [2, 'p', true], [7, 'p', false], [8, BACK[f]!, false]] as const) {
      const g = createPiece(type, white ? ivory : ebony, quality, white ? 1 : -1);
      g.position.copy(sq(file + rank)); scene.add(g); pieces[file + rank] = g;
    }
  }

  /* Apertura Italiana, jugada con el scroll */
  const PLIES: [string, string][] = [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], ['f8', 'c5']];
  const MOVE_START = .335, MOVE_END = .535, plyDur = (MOVE_END - MOVE_START) / PLIES.length;
  const plyT = (i: number, p: number) => clamp((p - (MOVE_START + i * plyDur)) / (plyDur * .82));
  function updateMoves(p: number) {
    PLIES.forEach(([from, to], i) => {
      const t = ease(plyT(i, p)), g = pieces[from]!, a = sq(from), b = sq(to);
      g.position.set(a.x + (b.x - a.x) * t, Math.sin(Math.PI * t) * (from === 'g1' || from === 'b8' ? .9 : .55), a.z + (b.z - a.z) * t);
    });
  }

  /* predicción: flechas y casillas de la última jugada */
  const overlay = new THREE.Group(); scene.add(overlay);
  const overlayMats: MeshBasicMaterial[] = [];
  const flatMat = (color: number, max: number) => {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    m.userData.max = max; overlayMats.push(m); return m;
  };
  function arrow(from: string, to: string, max: number) {
    const A = sq(from), B = sq(to), dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, px = -uz, pz = ux;
    const w = .14, hw = .4, hl = .36, s0 = .26, e = L - .1;
    const P = (a: number, b: number) => new THREE.Vector2(A.x + ux * a + px * b, -(A.z + uz * a + pz * b));
    const shape = new THREE.Shape([P(s0, -w / 2), P(e - hl, -w / 2), P(e - hl, -hw / 2), P(e, 0), P(e - hl, hw / 2), P(e - hl, w / 2), P(s0, w / 2)]);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), flatMat(0xe0a65c, max));
    m.rotation.x = -Math.PI / 2; m.position.y = .014; overlay.add(m);
  }
  function mark(name: string, color: number, max: number) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.98, .98), flatMat(color, max)); m.rotation.x = -Math.PI / 2;
    const v = sq(name); m.position.set(v.x, .008, v.z); overlay.add(m);
  }
  mark('f8', 0xd29c55, .22); mark('c5', 0xd29c55, .3);
  arrow('c2', 'c3', .92); arrow('e1', 'g1', .62); arrow('d2', 'd3', .46);

  const coachMat = new THREE.MeshBasicMaterial({ color: 0xe0a65c, transparent: true, opacity: 0, depthWrite: false });
  const coachRing = new THREE.Mesh(new THREE.RingGeometry(.4, .47, 64), coachMat);
  coachRing.rotation.x = -Math.PI / 2;
  { const v = sq('c4'); coachRing.position.set(v.x, .012, v.z); }
  scene.add(coachRing);

  /* ---------- vuelo de la cámara ---------- */
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const KEYS = [
    { p: 0, pos: V(7.6, 5.4, 12.2), tgt: V(0, .3, 0) },
    { p: .19, pos: V(-6.9, 1.05, 5.2), tgt: V(2, .3, 2.4) },
    { p: .31, pos: V(-1.6, 1.6, 7.4), tgt: V(0, .3, 1) },
    { p: .47, pos: V(4.4, 5.6, 7.8), tgt: V(.1, 0, .2) },
    { p: .665, pos: V(0, 15.6, .7), tgt: V(0, 0, .15) },
    { p: .81, pos: V(-3.1, 1.55, 3.5), tgt: V(-1.5, .55, .5) },
    { p: 1, pos: V(-9.4, 8.8, -6.4), tgt: V(0, 0, 0) },
  ];
  const posCurve = new THREE.CatmullRomCurve3(KEYS.map(k => k.pos), false, 'centripetal');
  const tgtCurve = new THREE.CatmullRomCurve3(KEYS.map(k => k.tgt), false, 'centripetal');
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
  function placeCamera(p: number, time: number) {
    let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1]!.p) i++;
    const a = KEYS[i]!, b = KEYS[i + 1]!;
    let t = clamp((p - a.p) / (b.p - a.p)); t = t * .3 + smooth(t) * .7;
    const u = (i + t) / (KEYS.length - 1);
    posCurve.getPoint(u, camPos); tgtCurve.getPoint(u, camTgt);
    if (dustOn) { camPos.x += Math.sin(time * .00031) * .06; camPos.y += Math.sin(time * .00047) * .04; }
    camera.position.copy(camPos); camera.lookAt(camTgt);
  }
  // el texto va abajo a la izquierda: el tablero se desplaza a la derecha (o hacia arriba en vertical)
  let lastAspect = 0;
  function frameView() {
    if (camera.aspect === lastAspect) return;
    lastAspect = camera.aspect;
    const W = canvas.clientWidth, H = canvas.clientHeight, portrait = W / H < .9;
    camera.fov = portrait ? 54 : 36;
    if (portrait) camera.setViewOffset(W, H, 0, H * .16, W, H); else camera.setViewOffset(W, H, -W * .16, 0, W, H);
    camera.updateProjectionMatrix();
  }

  /* ---------- un frame: solo cuando cambia el progreso, salvo polvo y pulso del coach ---------- */
  let progress = 0, lastDust = 0;
  stage.onFrame(now => {
    const p = progress;
    frameView();
    placeCamera(p, now);
    updateMoves(p);
    const ov = sstep(.565, .62, p) * (1 - sstep(.735, .785, p));
    overlayMats.forEach(m => { m.opacity = (m.userData.max as number) * ov; });
    overlay.visible = ov > .001;
    const coachA = sstep(.75, .79, p) * (1 - sstep(.85, .89, p));
    coachMat.opacity = .85 * coachA * (reducedMotion ? 1 : .75 + .25 * Math.sin(now * .003));
    const lampA = 1 - sstep(.52, .585, p) * (1 - sstep(.73, .79, p));
    shadeMat.opacity = bulbMat.opacity = cordMat.opacity = glowMat.opacity = lampA;
    lamp.visible = lampA > .01;
    if (DUST && now - lastDust >= 33) {   // polvo a ~30 fps
      lastDust = now;
      for (let i = 0; i < DUST; i++) {
        const seed = dustSeed[i]!;
        dustPos[i * 3 + 1]! += .0032 + Math.sin(now * .0005 + seed) * .0016;
        dustPos[i * 3]! += Math.sin(now * .0003 + seed) * .0024;
        if (dustPos[i * 3 + 1]! > 6.9) dustPos[i * 3 + 1] = .3;
      }
      dustAttr.needsUpdate = true;
    }
    return coachA > .001 && !reducedMotion;   // el anillo del coach late mientras se ve
  });

  return {
    setProgress(p) { progress = p; stage.invalidate(); },
    dispose: stage.dispose,
  };
};
