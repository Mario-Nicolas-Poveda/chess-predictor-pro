import { PIECE_VALUE, evaluate } from './evaluate';
import { ENGINE_LEVELS, type AiLevelId } from './levels';
import { apply, fromFen, inCheck, legal, pseudo, toUci, type Move, type Position } from './position';

export const MATE = 100_000;

interface Ctx { nodes: number; stop: boolean; deadline: number; quiesce: boolean; now: () => number }

/** Primero las capturas valiosas hechas con piezas baratas (MVV-LVA) y las coronaciones. Así la poda corta antes. */
function orderMoves(pos: Position, moves: Move[]): Move[] {
  const score = (m: Move) =>
    (m.cap >= 0 && pos.b[m.cap] ? 10 * PIECE_VALUE[pos.b[m.cap]!.t] - PIECE_VALUE[pos.b[m.from]!.t] : 0) +
    (m.promo ? PIECE_VALUE[m.promo] : 0);
  return moves.map(m => ({ m, s: score(m) })).sort((a, b) => b.s - a.s).map(x => x.m);
}

/** Negamax con poda alfa-beta. Devuelve el valor desde el lado que mueve. */
function search(pos: Position, depth: number, alpha: number, beta: number, ctx: Ctx, ply: number): number {
  ctx.nodes++;
  if ((ctx.nodes & 511) === 0 && ctx.now() > ctx.deadline) ctx.stop = true;
  if (ctx.stop) return 0;
  if (depth <= 0) return ctx.quiesce ? quiesce(pos, alpha, beta, ctx, 0) : evaluate(pos);
  const me = pos.turn;
  let legalCount = 0;
  for (const m of orderMoves(pos, pseudo(pos))) {
    const next = apply(pos, m);
    if (inCheck(next, me)) continue;                       // dejaría al rey en jaque
    legalCount++;
    const s = -search(next, depth - 1, -beta, -alpha, ctx, ply + 1);
    if (ctx.stop) return 0;
    if (s >= beta) return beta;
    if (s > alpha) alpha = s;
  }
  if (!legalCount) return inCheck(pos, me) ? -MATE + ply : 0;   // mate (antes es peor) o ahogado
  return alpha;
}

/** Al llegar al fondo, sigue solo capturas y coronaciones hasta que la posición se calma (máx. 4). */
function quiesce(pos: Position, alpha: number, beta: number, ctx: Ctx, qd: number): number {
  ctx.nodes++;
  const stand = evaluate(pos);
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  if (qd >= 4) return alpha;
  const me = pos.turn;
  for (const m of orderMoves(pos, pseudo(pos).filter(x => x.cap >= 0 || x.promo))) {
    const next = apply(pos, m);
    if (inCheck(next, me)) continue;
    const s = -quiesce(next, -beta, -alpha, ctx, qd + 1);
    if (s >= beta) return beta;
    if (s > alpha) alpha = s;
  }
  return alpha;
}

export interface Scored { move: Move; score: number }
export interface Analysis { scored: Scored[]; depth: number; nodes: number; ms: number }

/** Profundidad iterativa con tiempo límite. Puntúa TODAS las jugadas de la raíz (sirve para elegir y para predecir). */
export function analyse(pos: Position, o: { depth: number; quiesce: boolean; ms: number; now?: () => number }): Analysis {
  const now = o.now ?? Date.now, t0 = now();
  const ctx: Ctx = { nodes: 0, stop: false, deadline: t0 + o.ms, quiesce: o.quiesce, now };
  const root = legal(pos);
  let scored: Scored[] = root.map(move => ({ move, score: 0 })), depthDone = 0;
  for (let d = 1; d <= o.depth && root.length; d++) {
    const ordered = [...scored].sort((a, b) => b.score - a.score), cur: Scored[] = [];
    for (const x of ordered) {
      const s = -search(apply(pos, x.move), d - 1, -MATE, MATE, ctx, 1);
      if (ctx.stop) break;
      cur.push({ move: x.move, score: s });
    }
    if (ctx.stop && cur.length < ordered.length) break;   // profundidad a medias: vale la anterior
    scored = cur; depthDone = d;
  }
  scored.sort((a, b) => b.score - a.score);
  return { scored, depth: depthDone, nodes: ctx.nodes, ms: now() - t0 };
}

export interface EngineMove { uci: string; score: number; depth: number; nodes: number; ms: number }

/** La jugada del motor para un nivel: la mejor, con algo de azar en los niveles bajos. */
export function chooseMove(fen: string, level: AiLevelId, rng: () => number = Math.random, now?: () => number): EngineMove | null {
  const L = ENGINE_LEVELS[level], pos = fromFen(fen);
  const a = analyse(pos, { depth: L.depth, quiesce: L.quiesce, ms: L.ms, now });
  const top = a.scored[0];
  if (!top) return null;
  let best = top, bestNoisy = -Infinity;
  for (const x of a.scored) {
    const s = x.score + (L.noise ? (rng() * 2 - 1) * L.noise : 0);
    if (s > bestNoisy) { bestNoisy = s; best = x; }
  }
  return { uci: toUci(best.move), score: top.score, depth: a.depth, nodes: a.nodes, ms: a.ms };
}

/** Probabilidad de que ganen las blancas a partir del valor (vista del lado que mueve). */
export function winProbability(pos: Position, score: number): number {
  const cp = pos.turn === 'w' ? score : -score;
  if (Math.abs(score) > MATE / 2) return cp > 0 ? 1 : 0;
  return 1 / (1 + 10 ** (-cp / 400));
}

export interface PositionPrediction { white: number; top: { uci: string; pct: number }[]; depth: number }

/** Ventaja y las 3 jugadas más probables (softmax con temperatura de 80 cp sobre los valores de la raíz). */
export function predict(fen: string, ms = 300, now?: () => number): PositionPrediction {
  const pos = fromFen(fen);
  const a = analyse(pos, { depth: 2, quiesce: true, ms, now });
  if (!a.scored.length) return { white: inCheck(pos) ? (pos.turn === 'w' ? 0 : 1) : 0.5, top: [], depth: 0 };
  const top = a.scored.slice(0, 3), max = top[0]!.score;
  const w = top.map(x => Math.exp((Math.max(x.score, max - 600) - max) / 80)), sum = w.reduce((s, v) => s + v, 0);
  const pct = w.map(v => Math.round((100 * v) / sum));
  pct[0] = pct[0]! + 100 - pct.reduce((s, v) => s + v, 0);   // que sumen 100
  return { white: winProbability(pos, max), top: top.map((x, i) => ({ uci: toUci(x.move), pct: pct[i]! })), depth: a.depth };
}
