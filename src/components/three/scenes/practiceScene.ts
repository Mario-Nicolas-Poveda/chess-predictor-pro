import type { Group, Material, Mesh, Object3D } from 'three';
import type { Arrow, BoardPiece, Square } from '@/components/chess/types';
import { createBoard, createPiece, pieceMaterials, squareToXZ, srgb } from '../kit';
import { createStage } from '../stage';
import { ease } from '../tween';
import type { SceneFactory } from '../useThreeScene';

export type PracticeView = {
  pieces: BoardPiece[];                 // con id estable
  selected: Square | null;
  targets: Square[];                    // destinos vacíos
  captures: Square[];                   // destinos con pieza rival
  lastMove: [Square, Square] | null;
  arrows: Arrow[];
  interactive: boolean;                 // false mientras "piensa" el rival
  epoch: number;                        // cambia al reiniciar: las piezas vuelven a caer
};
export interface PracticeScene {
  update(view: PracticeView): void;
  onSquare(fn: (sq: Square) => void): void;
  onPickable(fn: (pickable: boolean) => void): void;   // para el cursor pointer
  dispose(): void;
}

export const createPracticeScene: SceneFactory<PracticeScene> = (canvas, { quality, reducedMotion }) => {
  const stage = createStage(canvas, { quality, reducedMotion, fov: 32, continuous: false });
  const { THREE, scene, camera, tweens } = stage;
  const board = createBoard({ light: '#efe4d3', dark: '#c9b08e', frame: '#4a2c24' });
  scene.add(board.group);
  const mats = pieceMaterials();

  // piezas por id
  const groups = new Map<string, Group>();
  const placed = new Map<string, BoardPiece>();
  let lifted: string | null = null;

  // marcas reutilizadas: no se crean mallas en cada update
  const wine = srgb('#6e1e2b');
  const markMat = new THREE.MeshBasicMaterial({ color: wine, transparent: true, opacity: .55, depthWrite: false });
  const discGeo = new THREE.CylinderGeometry(.16, .16, .03, 32), ringGeo = new THREE.TorusGeometry(.4, .045, 10, 48);
  const pool = (n: number, make: () => Mesh) => Array.from({ length: n }, () => { const m = make(); m.visible = false; scene.add(m); return m; });
  const discs = pool(28, () => { const m = new THREE.Mesh(discGeo, markMat); m.position.y = .02; return m; });
  const rings = pool(8, () => { const m = new THREE.Mesh(ringGeo, markMat); m.rotation.x = -Math.PI / 2; m.position.y = .02; return m; });
  const planeGeo = new THREE.PlaneGeometry(.98, .98);
  const overlay = (hex: string, opacity: number, y: number) => pool(1, () => {
    const m = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ color: srgb(hex), transparent: true, opacity, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = y; return m;
  })[0]!;
  const lastPlanes = [overlay('#c8a676', .55, .006), overlay('#c8a676', .55, .006)];
  const selPlane = overlay('#6e1e2b', .3, .008);
  const hoverPlane = overlay('#6e1e2b', .14, .01);
  const putOn = (m: Object3D, sq: Square) => { const p = squareToXZ(sq); m.position.x = p.x; m.position.z = p.z; m.visible = true; };

  const arrowGroup = new THREE.Group();
  scene.add(arrowGroup);
  let arrowKey = '';
  const drawArrows = (arrows: Arrow[]) => {
    const key = arrows.map(a => a.from + a.to + a.weight).join(' ');
    if (key === arrowKey) return;
    arrowKey = key;
    for (const c of [...arrowGroup.children] as Mesh[]) { arrowGroup.remove(c); c.geometry.dispose(); (c.material as Material).dispose(); }
    arrows.forEach((a, i) => {
      const A = squareToXZ(a.from), B = squareToXZ(a.to);
      const dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, px = -uz, pz = ux;
      const w = .13, hw = .38, hl = .34, s0 = .3, e = L - .12;
      // forma en el plano XY; al rotar -90° en X, y pasa a ser -z
      const P = (t: number, s: number) => new THREE.Vector2(A.x + ux * t + px * s, -(A.z + uz * t + pz * s));
      const shape = new THREE.Shape([P(s0, -w / 2), P(e - hl, -w / 2), P(e - hl, -hw / 2), P(e, 0), P(e - hl, hw / 2), P(e - hl, w / 2), P(s0, w / 2)]);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(shape),
        new THREE.MeshBasicMaterial({ color: wine, transparent: true, opacity: .3 + .5 * a.weight, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.position.y = .02 + i * .002;
      arrowGroup.add(m);
    });
  };

  let view: PracticeView | null = null;
  const addPiece = (p: BoardPiece, dropIndex: number | null) => {
    const g = createPiece(p.type, mats[p.color], quality, p.color === 'w' ? 1 : -1);
    g.traverse(o => { o.userData.pieceId = p.id; });
    const { x, z } = squareToXZ(p.square);
    g.position.set(x, 0, z);
    if (dropIndex !== null) {
      g.position.y = 5 + Math.random() * 2;
      tweens.to(g, { y: 0 }, { dur: 900, delay: 200 + dropIndex * 35, ease: ease.bounce });
    }
    scene.add(g); groups.set(p.id, g); placed.set(p.id, p);
  };
  const removePiece = (id: string) => { const g = groups.get(id); if (g) scene.remove(g); groups.delete(id); placed.delete(id); };

  const update = (v: PracticeView) => {
    const reset = view?.epoch !== v.epoch;
    view = v;
    if (reset) {
      [...groups.keys()].forEach(removePiece);
      lifted = null;
      v.pieces.forEach((p, i) => addPiece(p, i));
    } else {
      const alive = new Set(v.pieces.map(p => p.id));
      // capturadas: se hunden y desaparecen
      for (const id of [...groups.keys()]) if (!alive.has(id)) {
        const g = groups.get(id)!;
        placed.delete(id); groups.delete(id);
        tweens.to(g, { y: -.4 }, { dur: 380, scaleTo: 0, done: () => scene.remove(g) });
      }
      const selId = v.selected ? v.pieces.find(p => p.square === v.selected)?.id ?? null : null;
      if (lifted && lifted !== selId) { const g = groups.get(lifted); if (g) tweens.to(g, { y: 0 }, { dur: 180 }); }
      if (selId && selId !== lifted) tweens.to(groups.get(selId)!, { y: .3 }, { dur: 180 });
      lifted = selId;
      for (const p of v.pieces) {
        const prev = placed.get(p.id);
        if (!prev) { addPiece(p, null); continue; }
        if (prev.type !== p.type) { removePiece(p.id); addPiece(p, null); continue; }   // coronación
        if (prev.square !== p.square) {
          const { x, z } = squareToXZ(p.square);
          tweens.to(groups.get(p.id)!, { x, y: 0, z }, { dur: 560, hop: p.type === 'n' ? 1.1 : .45 });   // reemplaza el levantado
          placed.set(p.id, p);
        }
      }
    }
    discs.forEach((d, i) => { const sq = v.targets[i]; if (sq) putOn(d, sq); else d.visible = false; });
    rings.forEach((r, i) => { const sq = v.captures[i]; if (sq) putOn(r, sq); else r.visible = false; });
    if (v.selected) putOn(selPlane, v.selected); else selPlane.visible = false;
    lastPlanes.forEach((pl, i) => { const sq = v.lastMove?.[i]; if (sq) putOn(pl, sq); else pl.visible = false; });
    if (!v.interactive) hoverPlane.visible = false;
    drawArrows(v.arrows);
    stage.invalidate();
  };

  // selección con rayos
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = (ev: PointerEvent): Square | null => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const targets: Object3D[] = [...board.squares, ...groups.values()];
    for (const hit of ray.intersectObjects(targets, true)) {
      const id = hit.object.userData.pieceId as string | undefined;
      if (id) { const p = placed.get(id); if (p) return p.square; continue; }
      const sq = hit.object.userData.square as Square | undefined;
      if (sq) return sq;
    }
    return null;
  };
  const isPickable = (sq: Square | null) => !!sq && !!view?.interactive &&
    (view.targets.includes(sq) || view.captures.includes(sq) || view.pieces.some(p => p.square === sq && p.color === 'w'));

  let onSquareFn: (sq: Square) => void = () => {};
  let onPickableFn: (b: boolean) => void = () => {};
  let pickable = false, down: { x: number; y: number } | null = null;
  const mouse = { x: 0, y: 0 }, cam = { x: 0, y: 0 };
  const setPickable = (b: boolean) => { if (b !== pickable) { pickable = b; onPickableFn(b); } };

  const onMove = (ev: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((ev.clientX - r.left) / r.width) * 2 - 1; mouse.y = ((ev.clientY - r.top) / r.height) * 2 - 1;
    const sq = pick(ev), ok = isPickable(sq);
    if (ok && sq) putOn(hoverPlane, sq); else hoverPlane.visible = false;
    setPickable(ok);
    stage.invalidate();
  };
  const onDown = (ev: PointerEvent) => { down = { x: ev.clientX, y: ev.clientY }; };
  const onUp = (ev: PointerEvent) => {
    const wasClick = down && Math.abs(ev.clientX - down.x) + Math.abs(ev.clientY - down.y) <= 8;
    down = null;
    if (!wasClick || !view?.interactive) return;
    const sq = pick(ev);
    if (sq) onSquareFn(sq);
  };
  const onLeave = () => { mouse.x = 0; mouse.y = 0; hoverPlane.visible = false; setPickable(false); stage.invalidate(); };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);

  // parallax: la cámara sigue un poco al cursor y solo pide frames mientras se acerca
  stage.onFrame(() => {
    const tx = reducedMotion ? 0 : mouse.x * .9, ty = reducedMotion ? 0 : mouse.y * .5;
    cam.x += (tx - cam.x) * .05; cam.y += (ty - cam.y) * .05;
    const dist = Math.max(1, 1.02 / camera.aspect);
    camera.position.set(cam.x, (10.4 + cam.y) * dist, 9.2 * dist);
    camera.lookAt(0, 0, .45);
    return Math.abs(tx - cam.x) + Math.abs(ty - cam.y) > .001;
  });

  return {
    update,
    onSquare(fn) { onSquareFn = fn; },
    onPickable(fn) { onPickableFn = fn; },
    dispose() {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      stage.dispose();
    },
  };
};
