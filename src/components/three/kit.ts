import * as THREE from 'three';
import type { Quality } from './quality';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

// three ≥ 0.152 convierte los colores hex de sRGB a lineal por su cuenta. Las escenas se ajustaron con el modo
// anterior (convertimos a mano con srgb() y los demás valores ya son lineales): se mantiene ese modo para no cambiar el aspecto.
THREE.ColorManagement.enabled = false;
/** Desde three r155 las luces usan unidades físicas: las intensidades de antes se multiplican por π para verse igual. */
export const lux = (legacy: number) => legacy * Math.PI;
export const srgb = (hex: string) => new THREE.Color(hex).convertSRGBToLinear();

// Perfiles de torno de docs/design/landing-reference.html
const BASE: [number, number][] = [[0, 0], [.36, 0], [.36, .055], [.335, .085], [.3, .105], [.3, .13], [.25, .15]];
const PROFILES: Record<PieceType, [number, number][]> = {
  p: [...BASE, [.18, .2], [.12, .33], [.1, .4], [.17, .42], [.17, .45], [.075, .47], ...arc(.56, .11, -45, 90)],
  r: [...BASE, [.23, .2], [.2, .5], [.27, .56], [.27, .66], [0, .66]],
  n: [...BASE, [.22, .2], [.2, .3], [.25, .34], [0, .34]],
  b: [...BASE, [.2, .2], [.12, .48], [.18, .5], [.18, .53], [.1, .555], [.15, .62], [.16, .68], [.12, .76], [.05, .82], [0, .84]],
  q: [...BASE, [.22, .2], [.13, .6], [.21, .63], [.21, .66], [.13, .68], [.2, .83], [.23, .87], [.14, .87], [.09, .9], [0, .92]],
  k: [...BASE, [.23, .2], [.14, .62], [.22, .65], [.22, .68], [.14, .7], [.2, .86], [.21, .89], [.15, .9], [.07, .96], [0, .97]],
};
function arc(cy: number, r: number, a0: number, a1: number): [number, number][] {
  return Array.from({ length: 11 }, (_, i) => {
    const a = ((a0 + (a1 - a0) * i / 10) * Math.PI) / 180;
    return [Math.max(0, r * Math.cos(a)), cy + r * Math.sin(a)] as [number, number];
  });
}

type Geos = Record<PieceType, THREE.BufferGeometry> & {
  merlon: THREE.BufferGeometry; ball: THREE.BufferGeometry; crossV: THREE.BufferGeometry; crossH: THREE.BufferGeometry; head: THREE.BufferGeometry;
};
const cache = new Map<Quality, Geos>();

// Recetas de cada geometría: se crean una sola vez por calidad y quedan en caché.
function recipes(q: Quality): [keyof Geos, () => THREE.BufferGeometry][] {
  const seg = q === 'high' ? 48 : 24;
  const lathe = (pts: [number, number][]) => () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  const head = () => {
    const h = new THREE.ExtrudeGeometry(
      new THREE.Shape(([[-.21, .3], [.17, .3], [.14, .48], [.3, .6], [.37, .69], [.33, .76], [.13, .8], [.07, .93], [0, .86], [-.08, .91], [-.13, .78], [-.23, .6], [-.25, .44]] as const)
        .map(([x, y]) => new THREE.Vector2(x, y))),
      { depth: .16, bevelEnabled: true, bevelThickness: .04, bevelSize: .03, bevelSegments: 3, curveSegments: 8 });
    h.translate(0, 0, -.08);
    return h;
  };
  return [
    ['p', lathe(PROFILES.p)], ['r', lathe(PROFILES.r)], ['n', lathe(PROFILES.n)], ['b', lathe(PROFILES.b)], ['q', lathe(PROFILES.q)], ['k', lathe(PROFILES.k)],
    ['merlon', () => new THREE.BoxGeometry(.11, .1, .13)], ['ball', () => new THREE.SphereGeometry(1, 16, 12)],
    ['crossV', () => new THREE.BoxGeometry(.055, .22, .055)], ['crossH', () => new THREE.BoxGeometry(.17, .055, .055)], ['head', head],
  ];
}
function store(q: Quality, entries: [keyof Geos, THREE.BufferGeometry][]) {
  const g = Object.fromEntries(entries) as Geos;
  Object.values(g).forEach(geo => { geo.userData.shared = true; });   // no se liberan con una escena
  cache.set(q, g);
  return g;
}
function geos(q: Quality): Geos {
  return cache.get(q) ?? store(q, recipes(q).map(([k, make]) => [k, make()]));
}

/** Primera vez: una geometría por tarea (`step` cede el hilo y corta si se abortó). Después, caché. */
export async function geosAsync(q: Quality, step: () => Promise<void>) {
  if (cache.has(q)) return;
  const built: [keyof Geos, THREE.BufferGeometry][] = [];
  for (const [k, make] of recipes(q)) { built.push([k, make()]); await step(); }
  if (!cache.has(q)) store(q, built);
}


type SurfaceOpts = { color?: THREE.ColorRepresentation; map?: THREE.Texture | null; roughness?: number; metalness?: number;
  clearcoat?: number; clearcoatRoughness?: number; side?: THREE.Side; transparent?: boolean };

/** Material de superficie: alta = Physical con clearcoat; baja = Standard, que compila bastante más rápido. */
export function surface(q: Quality, o: SurfaceOpts): THREE.Material & { color: THREE.Color } {
  // three avisa por cada parámetro undefined: solo se pasan los definidos
  const defined = (x: object) => Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined));
  if (q === 'high' && o.clearcoat) return new THREE.MeshPhysicalMaterial(defined(o));
  return new THREE.MeshStandardMaterial(defined({ color: o.color, map: o.map, roughness: o.roughness, metalness: o.metalness, side: o.side, transparent: o.transparent }));
}

export function pieceMaterials(s: Quality = 'high') {
  return {
    w: surface(s, { color: srgb('#f3eadb'), roughness: s === 'high' ? .34 : .35, clearcoat: .5, clearcoatRoughness: .25 }),
    b: surface(s, { color: srgb('#2a1d18'), roughness: .3, clearcoat: .75, clearcoatRoughness: .18 }),
  };
}

// Sombra de contacto: en calidad baja no hay sombras en tiempo real, solo un degradado bajo cada pieza.
let blobTex: THREE.CanvasTexture | null = null;
function blobTexture() {
  if (blobTex) return blobTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  grd.addColorStop(0, 'rgba(20,12,10,.38)'); grd.addColorStop(1, 'rgba(20,12,10,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  blobTex = new THREE.CanvasTexture(c);
  blobTex.userData.shared = true;
  return blobTex;
}
let blobGeo: THREE.PlaneGeometry | null = null;
let blobMat: THREE.MeshBasicMaterial | null = null;
export function addContactShadow(piece: THREE.Group) {
  blobGeo ??= new THREE.PlaneGeometry(.95, .95);
  blobGeo.userData.shared = true;
  blobMat ??= new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false });
  blobMat.userData.shared = true;
  const m = new THREE.Mesh(blobGeo, blobMat);
  m.rotation.x = -Math.PI / 2; m.position.y = .004; m.renderOrder = -1;
  piece.add(m);
}

/** Pieza con sombras (o sombra de contacto en calidad baja). facing 1 = blancas (miran a -z), -1 = negras. */
export function createPiece(type: PieceType, mat: THREE.Material, q: Quality, facing = 1): THREE.Group {
  const g = geos(q);
  const grp = new THREE.Group();
  const mk = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, s = 1) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.setScalar(s); m.castShadow = m.receiveShadow = true; grp.add(m); return m;
  };
  mk(g[type]);
  if (type === 'r') for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; mk(g.merlon, Math.cos(a) * .215, .71, Math.sin(a) * .215).rotation.y = -a; }
  if (type === 'n') { mk(g.head); grp.rotation.y = facing < 0 ? -Math.PI / 2 : Math.PI / 2; }
  if (type === 'b') mk(g.ball, 0, .87, 0, .04);
  if (type === 'q') { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; mk(g.ball, Math.cos(a) * .2, .885, Math.sin(a) * .2, .036); } mk(g.ball, 0, .97, 0, .055); }
  if (type === 'k') { mk(g.crossV, 0, 1.08, 0); mk(g.crossH, 0, 1.1, 0); }
  if (q === 'low') addContactShadow(grp);
  return grp;
}

/** Tablero 8×8 con marco. Cada casilla lleva userData.square ('e4'). Blancas en +z. */
export function createBoard(colors: { light: string; dark: string; frame: string }, s: Quality = 'high') {
  const group = new THREE.Group();
  const light = surface(s, { color: srgb(colors.light), roughness: .6 });
  const dark = surface(s, { color: srgb(colors.dark), roughness: .6 });
  const tile = new THREE.BoxGeometry(1, .12, 1);
  const squares: THREE.Mesh[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const m = new THREE.Mesh(tile, (r + c) % 2 === 0 ? light : dark);
    m.position.set(c - 3.5, -.06, r - 3.5); m.receiveShadow = true;
    m.userData.square = FILES[c]! + (8 - r);
    group.add(m); squares.push(m);
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(9, .3, 9), surface(s, { color: srgb(colors.frame), roughness: .5 }));
  frame.position.y = -.2; frame.castShadow = frame.receiveShadow = true; group.add(frame);
  return { group, squares };
}

const FILES = 'abcdefgh';
export const squareToXZ = (sq: string) => ({ x: FILES.indexOf(sq.charAt(0)) - 3.5, z: 3.5 - (Number(sq.charAt(1)) - 1) });

/** Libera geometrías, materiales y sus texturas de un árbol, salvo las geometrías compartidas del kit. */
export function disposeTree(root: THREE.Object3D) {
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    mats.forEach(mt => { if (mt.userData.shared) return; (mt as THREE.MeshStandardMaterial).map?.dispose(); mt.dispose(); });
  });
}
