import type { PlayerSummary } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { bracketSizeFor, deadlineOf, feeders, gamesIn, roundName, roundsFor, seedOrder, type BracketSize } from '../domain/bracket';
import {
  SOON_MS, TOURNAMENT_POLL_MS,
  type BracketGame, type BracketPlayer, type BracketRound, type BracketSide, type GameScore, type NextTournamentGame,
  type Stage, type TournamentDetail, type TournamentListResponse, type TournamentStatus, type TournamentSummary,
} from '../infrastructure/dto/tournamentSchemas';
import type { GameRecord, NextGameRecord, PlayerRecord, TournamentListItemRecord, TournamentRecord } from './ports/TournamentRepository';

const stageOf = (round: number | null, size: BracketSize | null): Stage | null => {
  if (round == null || !size) return null;
  const rounds = roundsFor(size);
  return { round, rounds, name: roundName(round, rounds) };
};

export function pollAfter(status: TournamentStatus, startsAt: string, now: Date): number {
  if (status === 'running') return TOURNAMENT_POLL_MS.live;
  if (status === 'open') return new Date(startsAt).getTime() - now.getTime() <= SOON_MS ? TOURNAMENT_POLL_MS.live : TOURNAMENT_POLL_MS.later;
  return TOURNAMENT_POLL_MS.done;
}

const summaryOf = (p: PlayerSummary): PlayerSummary =>
  ({ id: p.id, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl, elo: p.elo });

export function toSummaryFromList(r: TournamentListItemRecord): TournamentSummary {
  return {
    id: r.id, name: r.name, timeControl: r.timeControl, size: r.size, startsAt: r.startsAt, status: r.status,
    players: r.players, joined: r.joined,
    stage: r.status === 'running' ? stageOf(r.stage, r.bracketSize) : null,
    winner: r.winner ? summaryOf(r.winner) : null, endedAt: r.endedAt,
  };
}

export function toNextGame(n: NextGameRecord): NextTournamentGame {
  return {
    tournamentId: n.tournamentId, tournamentName: n.tournamentName, matchId: n.matchId,
    stage: stageOf(n.round, n.bracketSize)!, color: n.color, opponent: summaryOf(n.opponent),
    matchStatus: n.matchStatus, deadline: n.deadline,
  };
}

export function toListResponse(tournaments: TournamentListItemRecord[], next: NextGameRecord | null, now: Date): TournamentListResponse {
  const live = tournaments.some(t => pollAfter(t.status, t.startsAt, now) === TOURNAMENT_POLL_MS.live) || !!next;
  return {
    tournaments: tournaments.map(toSummaryFromList),
    next: next ? toNextGame(next) : null,
    pollAfterMs: live ? TOURNAMENT_POLL_MS.live : TOURNAMENT_POLL_MS.later,
  };
}

/* ---------- La llave ---------- */

const NOBODY: BracketSide = { player: null, color: null, score: null, advanced: false };
const side = (player: BracketPlayer | null, color: 'white' | 'black' | null = null): BracketSide =>
  ({ player, color, score: null, advanced: false });

function scores(g: GameRecord): { white: GameScore; black: GameScore } {
  if (g.status !== 'done') return { white: null, black: null };
  if (g.decidedBy === 'draw') return { white: '½', black: '½' };
  const whiteWon = g.winnerId === g.whiteId;
  if (g.decidedBy === 'noshow') return whiteWon ? { white: '1', black: 'W.O.' } : { white: 'W.O.', black: '1' };
  return whiteWon ? { white: '1', black: '0' } : { white: '0', black: '1' };
}

/** Abierto: "si empezara ahora". Siembra por ELO; con 4 o más, quien no tiene rival pasaría directo. */
function previewRounds(entrants: BracketPlayer[]): BracketRound[] {
  const n = entrants.length, size = bracketSizeFor(n), rounds = roundsFor(size), ord = seedOrder(size);
  const out: BracketRound[] = [];
  for (let r = 1; r <= rounds; r++) {
    const games: BracketGame[] = [];
    for (let s = 1; s <= gamesIn(size, r); s++) {
      const top = r === 1 ? entrants[ord[2 * s - 2]! - 1] ?? null : null;
      const bottom = r === 1 ? entrants[ord[2 * s - 1]! - 1] ?? null : null;
      const bye = r === 1 && n >= 4 && !!top && !bottom;
      games.push({
        round: r, slot: s,
        top: side(top, top && bottom ? 'white' : null), bottom: bye ? NOBODY : side(bottom, top && bottom ? 'black' : null),
        bye, state: r === 1 ? 'preview' : 'tbd', matchId: null, ply: 0, decidedBy: null, deadline: null,
      });
    }
    out.push({ round: r, name: roundName(r, rounds), games });
  }
  return out;
}

/** En juego o terminado: lo que hay en la BD y 'tbd' donde todavía falta saber quién juega. */
function liveRounds(t: TournamentRecord, size: BracketSize, byId: Map<string, BracketPlayer>): BracketRound[] {
  const rounds = roundsFor(size);
  const at = new Map(t.games.map(g => [`${g.round}:${g.slot}`, g]));
  const find = (r: number, s: number) => at.get(`${r}:${s}`);
  const winnerOf = (r: number, s: number) => {
    const w = find(r, s)?.winnerId;
    return w ? byId.get(w) ?? null : null;
  };
  const out: BracketRound[] = [];
  for (let r = 1; r <= rounds; r++) {
    const games: BracketGame[] = [];
    for (let s = 1; s <= gamesIn(size, r); s++) {
      const g = find(r, s);
      if (!g) {
        const [a, b] = feeders(s);
        games.push({
          round: r, slot: s, top: side(r > 1 ? winnerOf(r - 1, a) : null), bottom: side(r > 1 ? winnerOf(r - 1, b) : null),
          bye: false, state: 'tbd', matchId: null, ply: 0, decidedBy: null, deadline: null,
        });
        continue;
      }
      const sc = scores(g), bye = g.status === 'bye';
      const white: BracketSide = { player: byId.get(g.whiteId) ?? null, color: bye ? null : 'white', score: sc.white, advanced: g.winnerId === g.whiteId };
      const black: BracketSide = g.blackId
        ? { player: byId.get(g.blackId) ?? null, color: 'black', score: sc.black, advanced: g.winnerId === g.blackId }
        : NOBODY;
      // arriba va quien viene de la partida de arriba (en la ronda 1, la mejor siembra: las blancas)
      const whiteOnTop = r === 1 || find(r - 1, feeders(s)[0])?.winnerId === g.whiteId;
      const state = bye ? 'bye' : g.status === 'done' ? 'done' : g.matchStatus === 'active' ? 'playing' : 'ready';
      games.push({
        round: r, slot: s, top: whiteOnTop ? white : black, bottom: whiteOnTop ? black : white,
        bye, state, matchId: g.matchId, ply: g.ply, decidedBy: g.decidedBy,
        deadline: state === 'ready' && g.createdAt ? deadlineOf(g.createdAt, t.noshowS) : null,
      });
    }
    out.push({ round: r, name: roundName(r, rounds), games });
  }
  return out;
}

const bySeedThenElo = (a: PlayerRecord, b: PlayerRecord) =>
  (a.seed ?? Infinity) - (b.seed ?? Infinity) || b.elo - a.elo || a.joinedAt.localeCompare(b.joinedAt);

export function toTournamentDetail(t: TournamentRecord, userId: string, now: Date): TournamentDetail {
  const open = t.status === 'open';
  const entrants: BracketPlayer[] = [...t.players].sort(bySeedThenElo).map((p, i) => ({
    id: p.id, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl, elo: p.elo,
    seed: open ? i + 1 : p.seed,
  }));
  const byId = new Map(entrants.map(p => [p.id, p]));
  const rounds = open ? previewRounds(entrants) : t.bracketSize ? liveRounds(t, t.bracketSize, byId) : [];

  const me = t.players.find(p => p.id === userId) ?? null;
  const mine = (g: GameRecord) => g.whiteId === userId || g.blackId === userId;
  const lost = t.games.some(g => g.status === 'done' && mine(g) && g.winnerId !== userId);
  const next = t.games.find(g => g.status === 'playing' && mine(g)) ?? null;
  const playing = t.games.filter(g => g.status === 'playing').map(g => g.round);
  const winner = t.winnerId ? byId.get(t.winnerId) ?? null : null;

  return {
    id: t.id, name: t.name, timeControl: t.timeControl, size: t.size, startsAt: t.startsAt, status: t.status,
    players: t.players.length, joined: !!me,
    stage: t.status === 'running' && playing.length ? stageOf(Math.min(...playing), t.bracketSize) : null,
    winner: winner ? summaryOf(winner) : null, endedAt: t.endedAt,
    noshowS: t.noshowS, startedAt: t.startedAt, bracketSize: t.bracketSize,
    entrants, rounds,
    you: {
      joined: !!me, seed: me?.seed ?? null,
      alive: !!me && (open || (t.status === 'running' && !lost) || (t.status === 'finished' && t.winnerId === userId)),
      nextMatchId: next?.matchId ?? null,
    },
    pollAfterMs: pollAfter(t.status, t.startsAt, now),
  };
}

export function toSummary(d: TournamentDetail): TournamentSummary {
  return {
    id: d.id, name: d.name, timeControl: d.timeControl, size: d.size, startsAt: d.startsAt, status: d.status,
    players: d.players, joined: d.joined, stage: d.stage, winner: d.winner, endedAt: d.endedAt,
  };
}
