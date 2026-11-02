import { PIECE_VALUE } from '@/modules/ai-engine/domain/evaluate';
import { apply, fromFen, toUci, type Position } from '@/modules/ai-engine/domain/position';
import { analyse, MATE, type Analysis } from '@/modules/ai-engine/domain/search';
import { openingName } from './openings';
import type { Color, MatchAnalysis, Motif, MoveClass, MoveReview, Phase, PlayedMove, SideSummary } from './types';

/**
 * Probabilidad de ganar (0–100) desde los centipeones, la misma curva logística del ELO.
 * El mate cuenta como 100 o 0.
 */
export const winPercent = (cpForSide: number) =>
  Math.abs(cpForSide) > MATE / 2 ? (cpForSide > 0 ? 100 : 0) : 100 / (1 + 10 ** (-cpForSide / 400));

/** Precisión de una jugada (0–100) según los puntos de probabilidad perdidos. Curva al estilo de la de Lichess. */
export const moveAccuracy = (winLoss: number) =>
  Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * winLoss) - 3.1669));

/** Umbrales en puntos de probabilidad perdidos (no en centipeones: perder 2 peones ganando por 10 no es grave). */
export function classify(winLoss: number, isBest: boolean): MoveClass {
  if (isBest || winLoss < 2) return 'best';
  if (winLoss < 5) return 'good';
  if (winLoss < 10) return 'inaccuracy';
  if (winLoss < 20) return 'mistake';
  return 'blunder';
}

function phaseOf(pos: Position, ply: number): Phase {
  let material = 0;                                      // piezas que no son peones ni reyes, de los dos
  for (const p of pos.b) if (p && p.t !== 'p' && p.t !== 'k') material += PIECE_VALUE[p.t];
  if (material <= 2600) return 'endgame';                // p. ej. torre y dos piezas menores por lado
  return ply <= 20 ? 'opening' : 'middlegame';
}

const emptySide = (): SideSummary => ({
  accuracy: 0,
  counts: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
  errorsByPhase: { opening: 0, middlegame: 0, endgame: 0 },
  motifs: {},
});

// Una instancia atiende a varios usuarios: entre posiciones deja pasar las peticiones que esperan
const breathe = () => new Promise<void>(resolve => { setTimeout(resolve); });

export interface AnalyseOptions {
  depth?: number;          // por defecto 3 con quiescencia (con 2 no ve un mate que tu jugada permite)
  msPerMove?: number;      // tope por posición (por defecto 500: holgado para que termine la profundidad, la peor medida tardó ~340 ms)
  now?: () => number;
  sanOf: (fen: string, uci: string) => string;          // SAN en inglés (GameRules.sanAt)
  result?: { winner: Color | null; reason: string };   // para el motivo de apuros de tiempo
  initialMs?: number | null;                           // reloj inicial (null = sin reloj)
}

/** Analiza todas las jugadas con el motor (profundidad 3). Una partida de 60 medias jugadas tarda unos 7 s. */
export async function analyseMatch(moves: PlayedMove[], o: AnalyseOptions): Promise<MatchAnalysis> {
  const depth = o.depth ?? 3, ms = o.msPerMove ?? 500;
  const out: MoveReview[] = [];
  const winWhite: number[] = [];
  const sides = { white: emptySide(), black: emptySide() };
  const accSum = { white: 0, black: 0 }, accN = { white: 0, black: 0 };
  const think = (pos: Position) => analyse(pos, { depth, quiesce: true, ms, now: o.now });

  // Valor de cada posición antes de cada jugada, desde el lado que mueve
  const evals: { pos: Position; a: Analysis }[] = [];
  for (const m of moves) {
    const pos = fromFen(m.fenBefore);
    evals.push({ pos, a: think(pos) });
    await breathe();
  }

  moves.forEach((m, i) => {
    const { pos, a } = evals[i]!;
    const color: Color = pos.turn === 'w' ? 'white' : 'black';
    const best = a.scored[0]!;
    const played = a.scored.find(x => toUci(x.move) === m.uci) ?? best;
    const before = winPercent(best.score), after = winPercent(played.score);
    const winLoss = Math.max(0, before - after);
    const isBest = toUci(best.move) === m.uci;
    const cls = classify(winLoss, isBest);
    const phase = phaseOf(pos, m.ply);
    const whiteAfter = color === 'white' ? after : 100 - after;
    if (i === 0) winWhite.push(color === 'white' ? before : 100 - before);
    winWhite.push(whiteAfter);

    // Motivos de una jugada concreta: un mate perdido siempre cuenta; lo demás, solo si la jugada costó algo
    let motif: Motif | null = null, piece: MoveReview['piece'] = null;
    if (best.score > MATE / 2 && played.score < MATE / 2) motif = 'missed_mate';
    else if (cls === 'mistake' || cls === 'blunder') {
      const posAfter = apply(pos, played.move);
      // La mejor respuesta del rival. En la última jugada (p. ej. antes de rendirse) esa posición no está analizada: se analiza aquí.
      const next = i === moves.length - 1 ? think(posAfter).scored[0] : evals[i + 1]?.a.scored[0];
      const victim = next && next.move.cap >= 0 ? posAfter.b[next.move.cap] : null;
      const missed = best.move.cap >= 0 ? pos.b[best.move.cap] : null;
      if (next && next.score > MATE / 2) motif = 'allowed_mate';
      else if (victim && PIECE_VALUE[victim.t] >= 300) {
        motif = 'hanging_piece'; piece = victim.t as MoveReview['piece'];
      } else if (missed && PIECE_VALUE[missed.t] >= 300 && played.move.cap < 0) {
        motif = 'missed_capture'; piece = missed.t as MoveReview['piece'];
      }
    }

    const s = sides[color];
    s.counts[cls]++;
    if (cls === 'inaccuracy' || cls === 'mistake' || cls === 'blunder') s.errorsByPhase[phase]++;
    if (motif) s.motifs[motif] = (s.motifs[motif] ?? 0) + 1;
    accSum[color] += moveAccuracy(winLoss); accN[color]++;

    out.push({
      ply: m.ply, color, uci: m.uci, san: m.san, class: cls, winLoss: Math.round(winLoss * 10) / 10,
      winWhiteAfter: Math.round(whiteAfter * 10) / 10,
      best: isBest ? null : { uci: toUci(best.move), san: o.sanOf(m.fenBefore, toUci(best.move)) },
      phase, motif, piece,
    });
  });

  // Motivos de la partida entera (hábitos)
  for (const color of ['white', 'black'] as const) {
    const mine = out.filter(x => x.color === color), s = sides[color];
    const add = (k: Motif) => { s.motifs[k] = (s.motifs[k] ?? 0) + 1; };
    const fromSquares = mine.map(x => x.uci.slice(0, 2));
    const queenHome = color === 'white' ? 'd1' : 'd8', kingHome = color === 'white' ? 'e1' : 'e8';
    if (fromSquares.slice(0, 5).includes(queenHome)) add('early_queen');
    const castled = mine.some(x => x.san.startsWith('O-O'));
    const kingMoved = fromSquares.includes(kingHome);
    if (mine.length >= 15 && !castled && !kingMoved) add('no_castle');
    if (mine.length >= 10) {
      const homes = color === 'white' ? ['b1', 'g1', 'c1', 'f1'] : ['b8', 'g8', 'c8', 'f8'];
      const moved = new Set(fromSquares.slice(0, 10));
      if (homes.filter(h => !moved.has(h)).length >= 2) add('undeveloped');
    }
    // winner null = tablas por tiempo (el rival no podía dar mate): ninguno perdió
    const lostOnTime = o.result?.reason === 'timeout' && o.result.winner === (color === 'white' ? 'black' : 'white');
    const clock = moves.filter((_, i) => out[i]!.color === color).map(x => x.msLeft).filter((v): v is number => v !== null);
    const lowClock = !!o.initialMs && clock.length >= 10 && clock.slice(-10).every(v => v < o.initialMs! * 0.1);
    if (lostOnTime || lowClock) add('time_trouble');
    s.accuracy = accN[color] ? Math.round(accSum[color] / accN[color]) : 0;
  }

  return {
    version: 1, depth, plies: moves.length, opening: openingName(moves.map(m => m.uci)),
    winWhite: winWhite.map(v => Math.round(v * 10) / 10), moves: out, white: sides.white, black: sides.black,
  };
}

/** Tus jugadas más caras (máx. 3), para "Momentos clave". */
export const keyMoments = (a: MatchAnalysis, you: Color, n = 3) =>
  a.moves.filter(m => m.color === you && (m.class === 'mistake' || m.class === 'blunder' || m.class === 'inaccuracy'))
    .sort((x, y) => y.winLoss - x.winLoss).slice(0, n).sort((x, y) => x.ply - y.ply);
