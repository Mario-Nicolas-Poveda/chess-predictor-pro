import type { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from 'three';
import type { BoardPiece, Square } from '@/components/chess/types';
import { createBoard, createPiece, geosAsync, pieceMaterials, squareToXZ, srgb } from '../kit';
import { createStage } from '../stage';
import { ease } from '../tween';
import type { SceneFactory } from '../useThreeScene';

export type BoardView = {
  pieces: BoardPiece[];
  captured: { white: string[]; black: string[] };   // fuera del tablero, en dos filas a cada lado
  selected: Square | null;
  targets: Square[];                                // destinos vacíos → disco
  captures: Square[];                               // destinos con pieza rival → anillo
  movable: Square[];                                // piezas tuyas con jugadas legales (cursor de mano)
  lastMove: [Square, Square] | null;
  check: Square | null;
  orientation: 'white' | 'black';                   // desde qué lado mira la cámara
  interactive: boolean;                             // false en turno del rival, en repetición o al terminar
  toppled: 'white' | 'black' | null;                // rey que cae al terminar
  ended: boolean;                                   // la cámara se aleja y sube el tablero
  colors: { tileL: string; tileD: string; frame: string; accent: string };
};
export interface GameBoardScene {
  update(v: BoardView): void;
  onSquare(fn: (sq: Square) => void): void;
  onPickable(fn: (pickable: boolean) => void): void;
  dispose(): void;
}

const FILES = 'abcdefgh';
type Layout = 'wide' | 'narrow';
const layoutOf = (canvas: HTMLCanvasElement): Layout => (canvas.clientWidth < 600 ? 'narrow' : 'wide');
// Capturadas fuera del tablero. Ancho: las negras a la derecha, las blancas a la izquierda, 8 por columna.
// Angosto: delante y detrás del tablero en una fila de hasta 15, para que la cámara se acerque.
const gravePos = (color: 'w' | 'b', n: number, layout: Layout) => {
  if (layout === 'narrow') return color === 'b' ? { x: -3.5 + n * .55, z: 5, scale: .55 } : { x: 3.5 - n * .55, z: -5, scale: .55 };
  const col = Math.floor(n / 8), row = n % 8;
  return color === 'b' ? { x: 5.05 + col * .62, z: 3.3 - row * .9, scale: .62 } : { x: -5.05 - col * .62, z: -3.3 + row * .9, scale: .62 };
};

export const createGameBoardScene: SceneFactory<GameBoardScene> = async (canvas, { quality: pre, reducedMotion, signal }) => {
  const stage = await createStage(canvas, { quality: pre, reducedMotion, signal, fov: 34 });
  const { THREE, scene, camera, tweens, quality } = stage;
  await geosAsync(quality, stage.step);

  const board = createBoard({ light: '#efe4d3', dark: '#c9b08e', frame: '#4a2c24' }, quality);
  scene.add(board.group);
  const tileL = board.squares[0]!.material as MeshStandardMaterial, tileD = board.squares[1]!.material as MeshStandardMaterial;
  const frameMat = (board.group.children[board.group.children.length - 1] as Mesh).material as MeshStandardMaterial;

  // coordenadas en el marco, legibles desde los dos lados
  const labelGeo = new THREE.PlaneGeometry(.32, .32);
  const label = (ch: string, x: number, z: number, rot: number) => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#e9dcc6'; g.font = '500 40px "JetBrains Mono", ui-monospace, monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 32, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(labelGeo, new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: .8, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, -.044, z);
    board.group.add(m);
  };
  for (let k = 0; k < 8; k++) {
    label(FILES[k]!, k - 3.5, 4.25, 0); label(FILES[k]!, k - 3.5, -4.25, Math.PI);
    label(String(8 - k), -4.25, k - 3.5, 0); label(String(8 - k), 4.25, k - 3.5, Math.PI);
  }
  await stage.step();

  const mats = pieceMaterials(quality);
  const groups = new Map<string, Group>();
  const placed = new Map<string, BoardPiece>();       // en el tablero
  const graved = new Set<string>();                   // en la fila de capturadas
  let lifted: string | null = null;
  let toppledId: string | null = null;
  let layout = layoutOf(canvas);

  // marcas reutilizadas: no se crean mallas en cada update
  const markMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: .55, depthWrite: false });
  const discGeo = new THREE.CylinderGeometry(.16, .16, .03, 32), ringGeo = new THREE.TorusGeometry(.4, .045, 10, 48);
  const pool = (n: number, make: () => Mesh) => Array.from({ length: n }, () => { const m = make(); m.visible = false; scene.add(m); return m; });
  const discs = pool(28, () => { const m = new THREE.Mesh(discGeo, markMat); m.position.y = .02; return m; });
  const rings = pool(8, () => { const m = new THREE.Mesh(ringGeo, markMat); m.rotation.x = -Math.PI / 2; m.position.y = .02; return m; });
  const planeGeo = new THREE.PlaneGeometry(.98, .98);
  const overlay = (opacity: number, y: number, hex?: string) => pool(1, () => {
    const m = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ ...(hex && { color: srgb(hex) }), transparent: true, opacity, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = y; return m;
  })[0]!;
  const lastPlanes = [overlay(.55, .006, '#c8a676'), overlay(.55, .006, '#c8a676')];
  const checkPlane = overlay(.32, .007, '#a3341f');
  const selPlane = overlay(.3, .008), hoverPlane = overlay(.14, .01);
  const accentMats = [markMat, selPlane.material, hoverPlane.material] as MeshBasicMaterial[];
  const putOn = (m: Object3D, sq: Square) => { const p = squareToXZ(sq); m.position.x = p.x; m.position.z = p.z; m.visible = true; };

  const addPiece = (p: BoardPiece) => {
    const g = createPiece(p.type, mats[p.color], quality, p.color === 'w' ? 1 : -1);
    g.traverse(o => { o.userData.pieceId = p.id; });
    const { x, z } = squareToXZ(p.square);
    g.position.set(x, 0, z);
    scene.add(g); groups.set(p.id, g);
    return g;
  };

  let view: BoardView | null = null;
  let colorsKey = '';
  const target = { a: 0, fin: 0 }, cam = { a: 0, fin: 0, x: 0, y: 0 }, mouse = { x: 0, y: 0 };

  const update = (v: BoardView) => {
    const first = view === null;
    view = v;
    const ck = Object.values(v.colors).join();
    if (ck !== colorsKey) {
      colorsKey = ck;
      tileL.color.copy(srgb(v.colors.tileL)); tileD.color.copy(srgb(v.colors.tileD)); frameMat.color.copy(srgb(v.colors.frame));
      accentMats.forEach(m => m.color.copy(srgb(v.colors.accent)));
    }
    target.a = v.orientation === 'white' ? 0 : Math.PI;
    target.fin = v.ended ? 1 : 0;

    if (first) {
      // al cargar, las piezas caen con rebote escalonado
      v.pieces.forEach((p, i) => {
        const g = addPiece(p);
        placed.set(p.id, p);
        g.position.y = 5 + Math.random() * 2;
        tweens.to(g, { y: 0 }, { dur: 900, delay: 200 + i * 30, ease: ease.bounce });
      });
    }
    // capturadas: viajan a su fila (con retraso para que llegue antes la pieza que captura)
    (['white', 'black'] as const).forEach(side => v.captured[side].forEach((id, n) => {
      if (graved.has(id)) return;
      let g = groups.get(id);
      if (!g) { const color = side === 'white' ? 'w' : 'b'; g = addPiece({ id, type: id[1] as BoardPiece['type'], color, square: 'a1' }); }
      placed.delete(id); graved.add(id);
      const { x, z, scale } = gravePos(side === 'white' ? 'w' : 'b', n, layout);
      tweens.to(g, { x, y: -.2, z }, { dur: 560, hop: .9, delay: 300, scaleTo: scale });
    }));
    const selId = v.selected ? v.pieces.find(p => p.square === v.selected)?.id ?? null : null;
    if (lifted && lifted !== selId && placed.has(lifted)) tweens.to(groups.get(lifted)!, { y: 0 }, { dur: 180 });
    if (selId && selId !== lifted) tweens.to(groups.get(selId)!, { y: .3 }, { dur: 180 });
    lifted = selId;
    for (const p of v.pieces) {
      const prev = placed.get(p.id);
      const fromGrave = graved.has(p.id);
      if (!prev && !fromGrave) { if (!groups.has(p.id)) addPiece(p); placed.set(p.id, p); continue; }
      if (prev && prev.type !== p.type) {
        // coronación (o vuelta a peón en la repetición): la pieza nueva crece en su casilla
        const old = groups.get(p.id)!; scene.remove(old);
        const g = addPiece(p); g.scale.setScalar(.01);
        tweens.to(g, {}, { dur: 420, delay: 420, scaleTo: 1 });
        placed.set(p.id, p); continue;
      }
      if (fromGrave || prev!.square !== p.square) {
        const { x, z } = squareToXZ(p.square);
        tweens.to(groups.get(p.id)!, { x, y: 0, z }, { dur: 560, hop: fromGrave ? .8 : p.type === 'n' ? 1.1 : .45, scaleTo: 1 });
        graved.delete(p.id); placed.set(p.id, p);
      }
    }
    // rey que cae al terminar (y se levanta si toppled vuelve a null)
    const kingId = v.toppled ? v.pieces.find(p => p.type === 'k' && p.color === (v.toppled === 'white' ? 'w' : 'b'))?.id ?? null : null;
    if (toppledId && toppledId !== kingId) {
      const p = placed.get(toppledId); const g = groups.get(toppledId);
      if (p && g) { const { x, z } = squareToXZ(p.square); tweens.to(g, { x, y: 0, z }, { dur: 600, rotZTo: 0 }); }
    }
    if (kingId && kingId !== toppledId) {
      const p = placed.get(kingId)!, g = groups.get(kingId)!, { x, z } = squareToXZ(p.square);
      const s = p.color === 'w' ? -1 : 1;
      tweens.to(g, { x: x + .42 * s, y: .3, z }, { dur: 1100, delay: 450, ease: ease.bounce, rotZTo: -1.42 * s });
    }
    toppledId = kingId;

    discs.forEach((d, i) => { const sq = v.targets[i]; if (sq) putOn(d, sq); else d.visible = false; });
    rings.forEach((r, i) => { const sq = v.captures[i]; if (sq) putOn(r, sq); else r.visible = false; });
    if (v.selected) putOn(selPlane, v.selected); else selPlane.visible = false;
    lastPlanes.forEach((pl, i) => { const sq = v.lastMove?.[i]; if (sq) putOn(pl, sq); else pl.visible = false; });
    if (v.check) putOn(checkPlane, v.check); else checkPlane.visible = false;
    if (!v.interactive) hoverPlane.visible = false;
    stage.invalidate();
  };

  // selección con rayos: piezas (userData.pieceId → casilla actual) y casillas; las capturadas no se eligen
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = (ev: PointerEvent): Square | null => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const targets: Object3D[] = [...board.squares, ...[...placed.keys()].map(id => groups.get(id)!)];
    for (const hit of ray.intersectObjects(targets, true)) {
      const id = hit.object.userData.pieceId as string | undefined;
      if (id) { const p = placed.get(id); if (p) return p.square; continue; }
      const sq = hit.object.userData.square as Square | undefined;
      if (sq) return sq;
    }
    return null;
  };
  const isPickable = (sq: Square | null) => !!sq && !!view?.interactive && (view.targets.includes(sq) || view.captures.includes(sq) || view.movable.includes(sq));

  let onSquareFn: (sq: Square) => void = () => {};
  let onPickableFn: (b: boolean) => void = () => {};
  let pickable = false, down: { x: number; y: number } | null = null;
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

  // cámara: giro del tablero, alejamiento al terminar y parallax suave; el jaque late (único frame continuo)
  stage.onFrame(now => {
    const l = layoutOf(canvas);
    if (l !== layout) {
      // cambió el ancho del escenario: las capturadas van a su sitio en el nuevo layout
      layout = l;
      (['white', 'black'] as const).forEach(side => view?.captured[side].forEach((id, n) => {
        const g = groups.get(id);
        if (!g || !graved.has(id)) return;
        const { x, z, scale } = gravePos(side === 'white' ? 'w' : 'b', n, layout);
        tweens.to(g, { x, y: -.2, z }, { dur: 300, scaleTo: scale });
      }));
    }
    cam.a += (target.a - cam.a) * (reducedMotion ? 1 : .06);
    cam.fin += (target.fin - cam.fin) * (reducedMotion ? 1 : .04);
    cam.x += ((reducedMotion ? 0 : mouse.x) * .8 - cam.x) * .05;
    cam.y += ((reducedMotion ? 0 : mouse.y) * .45 - cam.y) * .05;
    // angosto: sin capturadas a los lados, la cámara se acerca y el tablero llena el ancho
    const narrow = layout === 'narrow';
    const f = narrow ? Math.max(.93, 1.12 / camera.aspect) : Math.max(1, 1.2 / camera.aspect);
    const fit = f * (1 + .12 * cam.fin), R = 11 * fit;
    camera.position.set(Math.sin(cam.a) * R + Math.cos(cam.a) * cam.x, (13 + cam.y) * fit, Math.cos(cam.a) * R - Math.sin(cam.a) * cam.x);
    camera.lookAt(0, 0, Math.cos(cam.a) * ((narrow ? .75 * f : .35) + 1.5 * cam.fin));
    if (checkPlane.visible) (checkPlane.material as MeshBasicMaterial).opacity = reducedMotion ? .42 : .32 + .2 * Math.sin(now / 180);
    const moving = Math.abs(target.a - cam.a) + Math.abs(target.fin - cam.fin) + Math.abs(mouse.x * .8 - cam.x) + Math.abs(mouse.y * .45 - cam.y) > .001;
    return moving || (checkPlane.visible && !reducedMotion);
  });

  // compila los shaders de las piezas antes de que lleguen
  const warm = [createPiece('p', mats.w, quality), createPiece('p', mats.b, quality)];
  scene.add(...warm);
  await stage.finish();
  scene.remove(...warm);

  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);

  return {
    update,
    onSquare(fn) { onSquareFn = fn; },
    onPickable(fn) { onPickableFn = fn; },
    dispose() {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      // las piezas fuera de la escena (reemplazadas por coronación) comparten geometrías y materiales del kit
      stage.dispose();
    },
  };
};
