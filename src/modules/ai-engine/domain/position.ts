/** Reglas mínimas para buscar jugadas rápido. Casilla 0 = a8, 63 = h1. Sin dependencias. */
export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export interface Piece { c: Color; t: PieceType }
export interface Castling { wk: boolean; wq: boolean; bk: boolean; bq: boolean }
export interface Position { b: (Piece | null)[]; turn: Color; castle: Castling; ep: number; half: number; full: number }
export interface Move {
  from: number; to: number; t: PieceType;
  cap: number;                     // casilla de la pieza capturada (-1 = ninguna; al paso no es `to`)
  promo?: PieceType; dbl?: boolean; castle?: 'k' | 'q';
}

const FILES = 'abcdefgh';
const N_STEPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]] as const;
const K_STEPS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]] as const;
const ROOK_D = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const BISH_D = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
const PROMOS: PieceType[] = ['q', 'r', 'b', 'n'];

export const sqName = (i: number) => FILES.charAt(i % 8) + (8 - Math.floor(i / 8));
export const sqIdx = (s: string) => (8 - Number(s[1])) * 8 + FILES.indexOf(s.charAt(0));
const on = (c: number, r: number) => c >= 0 && c < 8 && r >= 0 && r < 8;
export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

export function fromFen(fen: string): Position {
  const [placement = '', turn = 'w', cs = '-', ep = '-', half = '0', full = '1'] = fen.trim().split(/\s+/);
  const b: (Piece | null)[] = [];
  for (const ch of placement.replace(/\//g, '')) {
    if (/[1-8]/.test(ch)) { for (let k = 0; k < Number(ch); k++) b.push(null); continue; }
    b.push({ c: ch === ch.toUpperCase() ? 'w' : 'b', t: ch.toLowerCase() as PieceType });
  }
  if (b.length !== 64) throw new Error('FEN_INVALID');
  return {
    b, turn: turn === 'b' ? 'b' : 'w',
    castle: { wk: cs.includes('K'), wq: cs.includes('Q'), bk: cs.includes('k'), bq: cs.includes('q') },
    ep: ep === '-' ? -1 : sqIdx(ep), half: Number(half) || 0, full: Number(full) || 1,
  };
}

export function attacked(b: (Piece | null)[], idx: number, by: Color): boolean {
  const c = idx % 8, r = Math.floor(idx / 8);
  const pr = by === 'w' ? r + 1 : r - 1;                       // fila desde la que atacaría un peón de `by`
  for (const dc of [-1, 1]) { const p = on(c + dc, pr) ? b[pr * 8 + c + dc] : null; if (p && p.c === by && p.t === 'p') return true; }
  for (const [dc, dr] of N_STEPS) { if (!on(c + dc, r + dr)) continue; const p = b[(r + dr) * 8 + c + dc]; if (p && p.c === by && p.t === 'n') return true; }
  for (const [dc, dr] of K_STEPS) { if (!on(c + dc, r + dr)) continue; const p = b[(r + dr) * 8 + c + dc]; if (p && p.c === by && p.t === 'k') return true; }
  const ray = (dirs: readonly (readonly [number, number])[], a: PieceType, z: PieceType) => {
    for (const [dc, dr] of dirs) {
      let x = c + dc, y = r + dr;
      while (on(x, y)) {
        const q = b[y * 8 + x];
        if (q) { if (q.c === by && (q.t === a || q.t === z)) return true; break; }
        x += dc; y += dr;
      }
    }
    return false;
  };
  return ray(ROOK_D, 'r', 'q') || ray(BISH_D, 'b', 'q');
}

export function kingSq(b: (Piece | null)[], color: Color): number {
  for (let i = 0; i < 64; i++) { const p = b[i]; if (p && p.c === color && p.t === 'k') return i; }
  return -1;
}
export function inCheck(pos: Position, color: Color = pos.turn): boolean {
  const k = kingSq(pos.b, color);
  return k >= 0 && attacked(pos.b, k, other(color));
}

/** Jugadas que siguen las reglas de movimiento; pueden dejar al rey en jaque (lo filtra `legal` o la búsqueda). */
export function pseudo(pos: Position): Move[] {
  const { b } = pos, me = pos.turn, foe = other(me), out: Move[] = [];
  const add = (from: number, to: number, extra: Partial<Move> = {}) =>
    out.push({ from, to, t: b[from]!.t, cap: b[to] ? to : -1, ...extra });
  for (let i = 0; i < 64; i++) {
    const p = b[i]; if (!p || p.c !== me) continue;
    const c = i % 8, r = Math.floor(i / 8);
    if (p.t === 'p') {
      const dir = me === 'w' ? -1 : 1, home = me === 'w' ? 6 : 1, last = me === 'w' ? 0 : 7, y = r + dir;
      const pawnTo = (to: number, extra: Partial<Move> = {}) => {
        if (Math.floor(to / 8) === last) for (const pr of PROMOS) add(i, to, { ...extra, promo: pr });
        else add(i, to, extra);
      };
      if (on(c, y) && !b[y * 8 + c]) {
        pawnTo(y * 8 + c);
        if (r === home && !b[(r + 2 * dir) * 8 + c]) add(i, (r + 2 * dir) * 8 + c, { dbl: true });
      }
      for (const dc of [-1, 1]) {
        if (!on(c + dc, y)) continue;
        const t = y * 8 + c + dc;
        if (b[t] && b[t]!.c === foe) pawnTo(t);
        else if (t === pos.ep) add(i, t, { cap: r * 8 + c + dc });       // al paso
      }
    } else if (p.t === 'n' || p.t === 'k') {
      for (const [dc, dr] of p.t === 'n' ? N_STEPS : K_STEPS) {
        if (!on(c + dc, r + dr)) continue;
        const q = b[(r + dr) * 8 + c + dc];
        if (!q || q.c === foe) add(i, (r + dr) * 8 + c + dc);
      }
      if (p.t === 'k') {
        const base = me === 'w' ? 56 : 0;
        if (i === base + 4 && !attacked(b, i, foe)) {
          const rook = (s: number) => b[s]?.t === 'r' && b[s]?.c === me;
          if (pos.castle[`${me}k`] && !b[base + 5] && !b[base + 6] && rook(base + 7) && !attacked(b, base + 5, foe) && !attacked(b, base + 6, foe)) add(i, base + 6, { castle: 'k' });
          if (pos.castle[`${me}q`] && !b[base + 3] && !b[base + 2] && !b[base + 1] && rook(base) && !attacked(b, base + 3, foe) && !attacked(b, base + 2, foe)) add(i, base + 2, { castle: 'q' });
        }
      }
    } else {
      const dirs = p.t === 'r' ? ROOK_D : p.t === 'b' ? BISH_D : [...ROOK_D, ...BISH_D];
      for (const [dc, dr] of dirs) {
        let x = c + dc, y = r + dr;
        while (on(x, y)) {
          const o = b[y * 8 + x];
          if (!o) add(i, y * 8 + x);
          else { if (o.c === foe) add(i, y * 8 + x); break; }
          x += dc; y += dr;
        }
      }
    }
  }
  return out;
}

/** Posición nueva tras `m` (no modifica `pos`). La coronación usa SIEMPRE `m.promo`. */
export function apply(pos: Position, m: Move): Position {
  const b = pos.b.slice(), me = pos.turn, mover = b[m.from]!;
  if (m.cap >= 0) b[m.cap] = null;
  b[m.to] = m.promo ? { c: me, t: m.promo } : mover;
  b[m.from] = null;
  if (m.castle) {
    const base = me === 'w' ? 56 : 0;
    if (m.castle === 'k') { b[base + 5] = b[base + 7] ?? null; b[base + 7] = null; } else { b[base + 3] = b[base] ?? null; b[base] = null; }
  }
  const castle = { ...pos.castle };
  if (mover.t === 'k') { castle[`${me}k`] = false; castle[`${me}q`] = false; }
  for (const [sq, key] of [[63, 'wk'], [56, 'wq'], [7, 'bk'], [0, 'bq']] as const) if (m.from === sq || m.to === sq) castle[key] = false;
  return {
    b, turn: other(me), castle, ep: m.dbl ? (m.from + m.to) / 2 : -1,
    half: mover.t === 'p' || m.cap >= 0 ? 0 : pos.half + 1, full: pos.full + (me === 'b' ? 1 : 0),
  };
}

export const legal = (pos: Position) => pseudo(pos).filter(m => !inCheck(apply(pos, m), pos.turn));
export const toUci = (m: Move) => sqName(m.from) + sqName(m.to) + (m.promo ?? '');
