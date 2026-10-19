import { ApiError, apiFetch, toApiError } from '@/lib/apiClient';
import { POLL_MS, type Color, type EndReason, type GameState, type MoveDTO } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { LocalGame, botDelay } from '../local/localGame';
import { eloDelta } from '../reasons';

export type StateResult = { state: GameState; etag: string } | 'not-modified';

export interface ArenaApi {
  state(id: string, since: number, etag: string | null, signal?: AbortSignal): Promise<StateResult>;
  move(id: string, uci: string, ply: number): Promise<{ move: MoveDTO; state: GameState }>;
  resign(id: string): Promise<{ state: GameState }>;
  offerDraw(id: string): Promise<{ state: GameState }>;
  declineDraw(id: string): Promise<void>;
  acceptDraw(id: string): Promise<{ state: GameState }>;
  cancel(id: string): Promise<void>;
}

const at = (id: string) => `/matches/${encodeURIComponent(id)}`;

const http: ArenaApi = {
  async state(id, since, etag, signal) {
    const res = await fetch(`/api/v1${at(id)}/state?since=${since}`, {
      cache: 'no-store', credentials: 'same-origin', signal,
      headers: etag ? { 'If-None-Match': etag } : undefined,
    });
    if (res.status === 304) return 'not-modified';           // 304 no es res.ok: se maneja antes
    if (!res.ok) throw await toApiError(res);
    return { state: (await res.json()).state, etag: res.headers.get('ETag') ?? '' };
  },
  move: (id, uci, ply) => apiFetch(`${at(id)}/moves`, { method: 'POST', body: JSON.stringify({ uci, ply }) }),
  resign: id => apiFetch(`${at(id)}/resign`, { method: 'POST' }),
  offerDraw: id => apiFetch(`${at(id)}/draw-offer`, { method: 'POST' }),
  declineDraw: id => apiFetch(`${at(id)}/draw-offer`, { method: 'DELETE' }),        // 204
  acceptDraw: id => apiFetch(`${at(id)}/draw-offer/accept`, { method: 'POST' }),
  cancel: id => apiFetch(at(id), { method: 'DELETE' }),                                // 204, solo pending
};

/** Mock en memoria (NEXT_PUBLIC_API_MOCK=1): juegas con blancas, 10 + 0, contra bob_gambito sobre localGame. Mismos códigos que la API. */
export function createMock(): ArenaApi {
  const START = 10 * 60_000, PENDING_MS = 3 * 60_000;
  const player = (username: string, elo: number) => ({ id: username, username, displayName: null, avatarUrl: null, elo });
  const players = { white: player('alice', 1450), black: player('bob_gambito', 1478) };
  type Mock = {
    game: LocalGame; moves: MoveDTO[]; status: GameState['status']; version: number; ms: Record<Color, number>;
    turnStartedAt: number | null; drawOffer: Color | null; result: { winner: Color | null; reason: EndReason } | null;
    createdAt: number; startedAt: number | null; endedAt: number | null;
  };
  const games = new Map<string, Mock>();
  const get = (id: string) => {
    let g = games.get(id);
    if (!g) games.set(id, g = { game: new LocalGame(), moves: [], status: 'pending', version: 1, ms: { white: START, black: START },
      turnStartedAt: null, drawOffer: null, result: null, createdAt: Date.now(), startedAt: null, endedAt: null });
    return g;
  };
  const delay = () => new Promise(r => setTimeout(r, 150));
  const iso = (t: number | null) => (t === null ? null : new Date(t).toISOString());

  const finish = (g: Mock, winner: Color | null, reason: EndReason) => {
    Object.assign(g, { status: 'finished', result: { winner, reason }, endedAt: Date.now(), turnStartedAt: null, drawOffer: null });
    g.version++;
  };
  const flag = (g: Mock) => {   // el servidor cierra por tiempo al consultar
    if (g.status === 'pending' && Date.now() - g.createdAt > PENDING_MS) { g.status = 'aborted'; g.version++; }
    if (g.status !== 'active' || g.turnStartedAt === null) return;
    const side = g.game.turn;
    if (g.ms[side] - (Date.now() - g.turnStartedAt) <= 0) { g.ms[side] = 0; finish(g, side === 'white' ? 'black' : 'white', 'timeout'); }
  };
  const apply = (g: Mock, uci: string): MoveDTO | null => {
    const now = Date.now(), side = g.game.turn;
    const m = g.game.play(uci);
    if (!m) return null;
    if (g.turnStartedAt !== null) g.ms[side] = Math.max(0, g.ms[side] - (now - g.turnStartedAt));
    if (g.status === 'pending') { g.status = 'active'; g.startedAt = now; }
    g.turnStartedAt = now; g.drawOffer = null; g.version++;
    const dto = { ply: g.game.ply, uci: m.uci, san: m.san, whiteMs: g.ms.white, blackMs: g.ms.black, at: new Date(now).toISOString() };
    g.moves.push(dto);
    const over = g.game.over();
    if (over) finish(g, over.winner, over.reason);
    else if (g.game.turn === 'black') setTimeout(() => {
      flag(g);
      const u = g.status === 'active' ? g.game.botPick() : null;
      if (u) apply(g, u);
    }, botDelay());
    return dto;
  };
  const toState = (id: string, g: Mock, since: number): GameState => {
    const turn = g.game.turn, last = g.moves.at(-1);
    const elo = (c: Color) => {
      const before = players[c].elo, w = g.result?.winner;
      const score = w === undefined ? 0 : w === null ? .5 : w === c ? 1 : 0;
      return { before, after: before + eloDelta(before, players[c === 'white' ? 'black' : 'white'].elo, score) };
    };
    return {
      id, status: g.status, version: g.version, timeControl: '10+0', yourColor: 'white', ply: g.game.ply, turn, fen: g.game.fen,
      check: !!last && /[+#]$/.test(last.san),
      moves: g.moves.filter(m => m.ply > since || m === last),
      clock: { whiteMs: g.ms.white, blackMs: g.ms.black, incrementMs: 0, running: g.status === 'active' ? turn : null,
        turnStartedAt: iso(g.turnStartedAt), serverNow: new Date().toISOString() },
      drawOffer: g.drawOffer, pendingExpiresAt: g.status === 'pending' ? iso(g.createdAt + PENDING_MS) : null,
      startedAt: iso(g.startedAt), endedAt: iso(g.endedAt),
      result: g.result && { ...g.result, elo: { white: elo('white'), black: elo('black') } },
      rematch: g.status === 'finished' ? { offeredBy: null, matchId: null } : null,
      you: players.white, opponent: players.black,
      pollAfterMs: g.status === 'pending' ? POLL_MS.pending : g.status === 'active' ? (turn === 'white' ? POLL_MS.yourTurn : POLL_MS.theirTurn) : POLL_MS.finished,
    };
  };
  const live = (g: Mock) => {
    flag(g);
    if (g.status === 'finished') throw new ApiError(409, 'MATCH_FINISHED', 'La partida terminó');
    if (g.status === 'aborted') throw new ApiError(409, 'MATCH_ABORTED', 'La partida se canceló');
  };

  return {
    async state(id, since, etag) {
      await delay();
      const g = get(id);
      flag(g);
      const tag = `"${g.version}"`;
      return tag === etag ? 'not-modified' : { state: toState(id, g, since), etag: tag };
    },
    async move(id, uci, ply) {
      await delay();
      const g = get(id);
      live(g);
      if (g.game.turn !== 'white') throw new ApiError(409, 'NOT_YOUR_TURN', 'No es tu turno');
      if (ply !== g.game.ply) throw new ApiError(409, 'STALE_PLY', 'La posición cambió');
      const move = apply(g, uci);
      if (!move) throw new ApiError(422, 'ILLEGAL_MOVE', 'Esa jugada no es legal');
      return { move, state: toState(id, g, ply) };
    },
    async resign(id) {
      await delay();
      const g = get(id);
      live(g);
      finish(g, 'black', 'resign');
      return { state: toState(id, g, 0) };
    },
    async offerDraw(id) {
      await delay();
      const g = get(id);
      live(g);
      if (g.drawOffer) throw new ApiError(409, 'DRAW_ALREADY_OFFERED', 'Ya hay una oferta de tablas');
      g.drawOffer = 'white'; g.version++;
      setTimeout(() => {   // el bot contesta: acepta desde la jugada 10
        if (g.drawOffer !== 'white') return;
        if (g.game.acceptsDraw()) finish(g, null, 'agreement'); else { g.drawOffer = null; g.version++; }
      }, 1500);
      return { state: toState(id, g, 0) };
    },
    async declineDraw(id) {
      await delay();
      const g = get(id);
      if (!g.drawOffer) throw new ApiError(404, 'NO_DRAW_OFFER', 'No hay oferta de tablas');
      g.drawOffer = null; g.version++;
    },
    async acceptDraw(id) {
      await delay();
      const g = get(id);
      live(g);
      if (g.drawOffer !== 'black') throw new ApiError(404, 'NO_DRAW_OFFER', 'No hay oferta de tablas');
      finish(g, null, 'agreement');
      return { state: toState(id, g, 0) };
    },
    async cancel(id) {
      await delay();
      const g = get(id);
      if (g.status !== 'pending') throw new ApiError(409, 'MATCH_NOT_PENDING', 'La partida ya empezó');
      g.status = 'aborted'; g.version++;
    },
  };
}

export const arenaApi: ArenaApi = process.env.NEXT_PUBLIC_API_MOCK === '1' ? createMock() : http;
