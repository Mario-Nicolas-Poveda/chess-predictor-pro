import { MOTIFS, type Color, type MatchAnalysis, type Motif, type MoveClass, type Phase, type SummaryStats } from './types';
import type { HistoryFacts } from './coachInput';
import type { PlanStats } from './planInput';

export type GameResult = 'win' | 'loss' | 'draw';

/** Lo que se guarda en game_reviews.facts: una partida vista desde un jugador. Sin nombres ni texto de usuarios. */
export interface ReviewFacts {
  v: 1;
  color: Color;
  result: GameResult;
  reason: string;                       // checkmate, resign, timeout…
  endedAt: string;                      // ISO 8601
  opponent: 'ai' | 'human';
  opening: string | null;
  plies: number;
  accuracy: number;
  opponentAccuracy: number;
  counts: Record<MoveClass, number>;
  errorsByPhase: Record<Phase, number>;
  motifs: Partial<Record<Motif, number>>;
}
export interface FactsRow { matchId: string; facts: ReviewFacts }

export function factsOf(a: MatchAnalysis, you: Color,
  g: { result: GameResult; reason: string; endedAt: string; opponent: 'ai' | 'human' }): ReviewFacts {
  const side = a[you], rival = a[you === 'white' ? 'black' : 'white'];
  return {
    v: 1, color: you, result: g.result, reason: g.reason, endedAt: g.endedAt, opponent: g.opponent,
    opening: a.opening, plies: a.plies, accuracy: side.accuracy, opponentAccuracy: rival.accuracy,
    counts: { ...side.counts }, errorsByPhase: { ...side.errorsByPhase }, motifs: { ...side.motifs },
  };
}

export const HISTORY_WINDOW = 10;       // partidas previas que ve el consejo de una partida
export const SUMMARY_WINDOW = 20;       // partidas que usa el plan

const PHASES: Phase[] = ['opening', 'middlegame', 'endgame'];
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const round1 = (x: number) => Math.round(x * 10) / 10;
const newestFirst = (a: FactsRow, b: FactsRow) => b.facts.endedAt.localeCompare(a.facts.endedAt);

/** Motivos sumados; `rows` de la más nueva a la más vieja (así lastMatchId es la más reciente). */
function motifTotals(rows: FactsRow[]) {
  const m = new Map<Motif, { count: number; lastMatchId: string }>();
  for (const r of rows) for (const k of MOTIFS) {
    const n = r.facts.motifs[k] ?? 0;
    if (!n) continue;
    const cur = m.get(k);
    if (cur) cur.count += n; else m.set(k, { count: n, lastMatchId: r.matchId });
  }
  return [...m].map(([motif, v]) => ({ motif, ...v }))
    .sort((a, b) => b.count - a.count || MOTIFS.indexOf(a.motif) - MOTIFS.indexOf(b.motif));
}

function phaseTotals(rows: FactsRow[]): Record<Phase, number> {
  const t = { opening: 0, middlegame: 0, endgame: 0 };
  for (const r of rows) for (const p of PHASES) t[p] += r.facts.errorsByPhase[p];
  return t;
}

function worstPhase(t: Record<Phase, number>): Phase | null {
  const w = PHASES.reduce<Phase>((best, p) => (t[p] > t[best] ? p : best), 'opening');
  return t[w] > 0 ? w : null;
}

const STREAK_ES: Record<GameResult, string> = { win: 'victorias', loss: 'derrotas', draw: 'tablas' };

/** Historial para el consejo de UNA partida: las analizadas antes que ella. */
export function historyFacts(prev: FactsRow[]): HistoryFacts {
  const rows = [...prev].sort(newestFirst).slice(0, HISTORY_WINDOW);
  const last = rows[0];
  if (!last) return { games: 0, accuracyAvg: null, blundersPerGame: null, topMotif: null, worstPhase: null, streak: null };
  let n = 1;
  while (rows[n]?.facts.result === last.facts.result) n++;
  return {
    games: rows.length,
    accuracyAvg: Math.round(avg(rows.map(r => r.facts.accuracy))),
    blundersPerGame: round1(avg(rows.map(r => r.facts.counts.blunder))),
    topMotif: motifTotals(rows)[0]?.motif ?? null,
    worstPhase: worstPhase(phaseTotals(rows)),
    streak: n >= 2 ? `${n} ${STREAK_ES[last.facts.result]} seguidas` : null,
  };
}

function openingTable(rows: FactsRow[]): SummaryStats['openings'] {
  const m = new Map<string, SummaryStats['openings'][number]>();
  for (const { facts: f } of rows) {
    if (!f.opening) continue;
    const key = `${f.color}|${f.opening}`;
    const o = m.get(key) ?? { name: f.opening, color: f.color, games: 0, wins: 0, draws: 0, losses: 0 };
    o.games++;
    if (f.result === 'win') o.wins++; else if (f.result === 'draw') o.draws++; else o.losses++;
    m.set(key, o);
  }
  return [...m.values()].sort((a, b) => b.games - a.games || a.name.localeCompare(b.name, 'es'));
}

/** Estadísticas del plan con las últimas partidas analizadas (máx. SUMMARY_WINDOW). */
export function aggregate(rows: FactsRow[], yourElo: number): { stats: SummaryStats; plan: PlanStats } {
  const newest = [...rows].sort(newestFirst).slice(0, SUMMARY_WINDOW);
  const oldest = [...newest].reverse();
  const acc = oldest.map(r => r.facts.accuracy);
  const half = Math.floor(acc.length / 2);                  // con un número impar, la del medio no cuenta para la tendencia
  const motifs = motifTotals(newest);
  const openings = openingTable(newest);
  const errorsByPhase = phaseTotals(newest);
  const blundersPerGame = round1(avg(newest.map(r => r.facts.counts.blunder)));
  const accuracyAvg = Math.round(avg(acc));
  const results = { wins: 0, draws: 0, losses: 0, timeouts: 0 };
  for (const { facts: f } of newest) {
    if (f.result === 'win') results.wins++; else if (f.result === 'draw') results.draws++; else results.losses++;
    if (f.result === 'loss' && f.reason === 'timeout') results.timeouts++;
  }
  return {
    stats: {
      games: newest.length, accuracyAvg, blundersPerGame, errorsByPhase,
      accuracyTrend: oldest.map(r => ({ matchId: r.matchId, endedAt: r.facts.endedAt, accuracy: r.facts.accuracy })),
      topMotifs: motifs.slice(0, 5),
      openings: openings.slice(0, 6),
    },
    plan: {
      games: newest.length, accuracyAvg, blundersPerGame, errorsByPhase, results, yourElo, openings,
      accuracyFirstHalf: Math.round(avg(acc.slice(0, half))),
      accuracySecondHalf: Math.round(avg(acc.slice(acc.length - half))),
      topMotifs: motifs.map(({ motif, count }) => ({ motif, count })),
    },
  };
}
