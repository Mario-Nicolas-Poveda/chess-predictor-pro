import * as THREE from 'three';
import type { Quality } from './quality';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
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

/** Geometrías creadas una sola vez por calidad. Marcadas como compartidas para no liberarlas con una escena. */
function geos(q: Quality): Geos {
  const hit = cache.get(q);
  if (hit) return hit;
  const seg = q === 'high' ? 48 : 32;
  const lathe = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  const head = new THREE.ExtrudeGeometry(
    new THREE.Shape(([[-.21, .3], [.17, .3], [.14, .48], [.3, .6], [.37, .69], [.33, .76], [.13, .8], [.07, .93], [0, .86], [-.08, .91], [-.13, .78], [-.23, .6], [-.25, .44]] as const)
      .map(([x, y]) => new THREE.Vector2(x, y))),
    { depth: .16, bevelEnabled: true, bevelThickness: .04, bevelSize: .03, bevelSegments: 3, curveSegments: 8 });
  head.translate(0, 0, -.08);
  const g: Geos = {
    p: lathe(PROFILES.p), r: lathe(PROFILES.r), n: lathe(PROFILES.n), b: lathe(PROFILES.b), q: lathe(PROFILES.q), k: lathe(PROFILES.k),
    merlon: new THREE.BoxGeometry(.11, .1, .13), ball: new THREE.SphereGeometry(1, 16, 12),
    crossV: new THREE.BoxGeometry(.055, .22, .055), crossH: new THREE.BoxGeometry(.17, .055, .055), head,
  };
  Object.values(g).forEach(geo => { geo.userData.shared = true; });
  cache.set(q, g);
  return g;
}

export function pieceMaterials() {
  return {
    w: new THREE.MeshPhysicalMaterial({ color: srgb('#f3eadb'), roughness: .34, clearcoat: .5, clearcoatRoughness: .25 }),
    b: new THREE.MeshPhysicalMaterial({ color: srgb('#2a1d18'), roughness: .3, clearcoat: .75, clearcoatRoughness: .18 }),
  };
}

/** Pieza con sombras. facing 1 = blancas (miran a -z), -1 = negras. */
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
  return grp;
}

/** Tablero 8×8 con marco. Cada casilla lleva userData.square ('e4'). Blancas en +z. */
export function createBoard(colors: { light: string; dark: string; frame: string }) {
  const group = new THREE.Group();
  const light = new THREE.MeshStandardMaterial({ color: srgb(colors.light), roughness: .6 });
  const dark = new THREE.MeshStandardMaterial({ color: srgb(colors.dark), roughness: .6 });
  const tile = new THREE.BoxGeometry(1, .12, 1);
  const squares: THREE.Mesh[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const m = new THREE.Mesh(tile, (r + c) % 2 === 0 ? light : dark);
    m.position.set(c - 3.5, -.06, r - 3.5); m.receiveShadow = true;
    m.userData.square = FILES[c]! + (8 - r);
    group.add(m); squares.push(m);
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(9, .3, 9), new THREE.MeshStandardMaterial({ color: srgb(colors.frame), roughness: .5 }));
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
    mats.forEach(mt => { (mt as THREE.MeshStandardMaterial).map?.dispose(); mt.dispose(); });
  });
}
