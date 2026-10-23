import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerDirectory } from '@/modules/matchmaking/domain/PlayerDirectory';
import type { PlayerSummary } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { ConflictError, TooManyRequestsError } from '@/core/shared/errors/AppError';
import { zodFields } from '@/core/shared/errors/zodFields';
import type { ArenaRepository, CommitMove, HistoryRow, Outcome3 } from '../../domain/ArenaRepository';
import { eloDelta } from '../../domain/elo';
import { matchFinished, matchNotActive, matchNotFound, noDrawOffer, notAiMatch, ownDrawOffer, stalePly } from '../../domain/errors';
import type { AiPlayers } from '../../domain/AiPlayers';
import { other, turnOf, type MatchRecord, type MoveRecord } from '../../domain/Match';
import { ChessJsRules } from '../../infrastructure/ChessJsRules';
import { HistoryQuerySchema, type Color, type EndReason } from '../../infrastructure/dto/arenaSchemas';
import { EngineMovePicker } from '@/modules/ai-engine/infrastructure/EngineMovePicker';
import { AI_LEVELS, CreateAiGameSchema, type AiLevel, type AiTimeControl } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import { AnswerDraw } from '../AnswerDraw';
import { BotTurn } from '../BotTurn';
import { CreateAiGame } from '../CreateAiGame';
import { GetAiLevels } from '../GetAiLevels';
import { GetGameState } from '../GetGameState';
import { GetPrediction } from '../GetPrediction';
import { GetMatchHistory } from '../GetMatchHistory';
import { GetProfileHistory } from '../GetProfileHistory';
import { Rematch } from '../Rematch';
import { MakeMove } from '../MakeMove';
import { OfferDraw } from '../OfferDraw';
import { PlayAiTurn } from '../PlayAiTurn';
import { Resign } from '../Resign';
import { SuggestMove } from '../SuggestMove';
import { Takeback } from '../Takeback';

const record = (): MatchRecord => ({
  id: 'm1', whiteId: 'ana', blackId: 'bob', timeControl: '10+0', status: 'pending', createdAt: new Date(),
  version: 0, ply: 0, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  whiteMs: 600_000, blackMs: 600_000, incrementMs: 0, turnStartedAt: null, startedAt: null, endedAt: null,
  result: null, endReason: null, drawOfferBy: null, drawOfferedAt: null, rematchOfferBy: null, rematchOfferedAt: null, rematchId: null,
  whiteEloBefore: null, blackEloBefore: null, whiteEloAfter: null, blackEloAfter: null,
  rated: true, aiPrediction: false, takebacks: 0,
});

// Una sola partida (m1). Imita lo que hacen las funciones SQL de 0004 en lo que tocan estos casos de uso
class MemoryArenaRepo implements ArenaRepository {
  m = record();
  moves: MoveRecord[] = [];
  bots: string[] = [];
  private get(id: string) { return id === this.m.id ? this.m : undefined; }
  private touch(s: Partial<MatchRecord>) { Object.assign(this.m, s, { version: this.m.version + 1 }); }
  private close(result: Color | 'draw', reason: EndReason) {
    if (this.m.status === 'finished' || this.m.status === 'aborted') return;
    const d = eloDelta(1500, 1500, result === 'white' ? 1 : result === 'black' ? 0 : 0.5);
    this.touch({ status: 'finished', result, endReason: reason, endedAt: new Date(), turnStartedAt: null,
      drawOfferBy: null, drawOfferedAt: null, whiteEloBefore: 1500, blackEloBefore: 1500, whiteEloAfter: 1500 + d.white, blackEloAfter: 1500 + d.black });
  }
  async settle(id: string) {
    const m = this.get(id);
    if (m?.status !== 'active' || !m.turnStartedAt) return;
    const side = turnOf(m.ply);
    if ((side === 'white' ? m.whiteMs : m.blackMs) > Date.now() - m.turnStartedAt.getTime()) return;
    this.close(other(side), 'timeout');   // la BD da tablas si el rival no puede dar mate
  }
  async findMatch(id: string) { const m = this.get(id); return m ? { ...m } : null; }
  async listMoves(_id: string, sincePly = 0) { return this.moves.filter(x => x.ply > sincePly); }
  async findMove(_id: string, ply: number) { return this.moves.find(x => x.ply === ply) ?? null; }
  async commitMove(c: CommitMove) {
    const m = this.get(c.matchId);
    if (!m || m.ply !== c.expectedPly || (m.status !== 'pending' && m.status !== 'active')) throw stalePly();
    this.touch({ ply: m.ply + 1, fen: c.fen, whiteMs: c.whiteMs, blackMs: c.blackMs, status: 'active',
      startedAt: m.startedAt ?? new Date(), turnStartedAt: new Date(),
      ...(m.drawOfferBy === c.mover ? {} : { drawOfferBy: null, drawOfferedAt: null }) });   // jugar rechaza la oferta del rival
    this.moves.push({ ply: m.ply, uci: c.uci, san: c.san, whiteMs: c.whiteMs, blackMs: c.blackMs, createdAt: new Date() });
    if (c.outcome) this.close(c.outcome.result, c.outcome.reason);
    return m.ply;
  }
  async finish(id: string, result: Color | 'draw', reason: EndReason) { if (this.get(id)) this.close(result, reason); }
  async offerDraw(id: string, by: Color) {
    const m = this.get(id);
    if (m?.status !== 'active' || m.drawOfferBy) return false;
    this.touch({ drawOfferBy: by, drawOfferedAt: new Date() });
    return true;
  }
  async clearDrawOffer(id: string) {
    if (!this.get(id)?.drawOfferBy) return false;
    this.touch({ drawOfferBy: null, drawOfferedAt: null });
    return true;
  }
  async botIds(ids: string[]) { return ids.filter(id => this.bots.includes(id)); }
  rows: HistoryRow[] = [];
  created: MatchRecord[] = [];
  async history(_userId: string, outcome: Outcome3 | null, before: string | null, limit: number) {
    return this.rows.filter(r => (!outcome || r.outcome === outcome) && (!before || r.endedAt < new Date(before)))
      .sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime()).slice(0, limit);
  }
  async eloSeries() { return [{ date: '2026-10-17', elo: 1450 }, { date: '2026-10-18', elo: 1467 }]; }
  async rematch(id: string, by: Color) {
    const m = this.get(id);
    if (!m) throw matchNotFound();
    if (m.status !== 'finished') throw new ConflictError('MATCH_NOT_FINISHED', 'La revancha se pide cuando la partida termina');
    if (m.rematchId) return m.rematchId;
    if (!m.rematchOfferBy) { this.touch({ rematchOfferBy: by, rematchOfferedAt: new Date() }); return null; }
    if (m.rematchOfferBy === by) throw new ConflictError('REMATCH_ALREADY_OFFERED', 'Ya pediste la revancha');
    this.created.push({ ...record(), id: 'm2', whiteId: m.blackId, blackId: m.whiteId, timeControl: m.timeControl });
    this.touch({ rematchId: 'm2', rematchOfferBy: null, rematchOfferedAt: null });
    return 'm2';
  }
  async cancelRematch(id: string) {
    const m = this.get(id);
    if (!m?.rematchOfferBy || m.rematchId) return false;
    this.touch({ rematchOfferBy: null, rematchOfferedAt: null });
    return true;
  }
  async acceptDraw(id: string, by: Color) {
    const m = this.get(id);
    if (!m) throw matchNotFound();
    if (m.status !== 'active') throw matchNotActive();
    if (!m.drawOfferBy) throw noDrawOffer();
    if (m.drawOfferBy === by) throw ownDrawOffer();
    this.close('draw', 'agreement');
  }
  // 0005: una partida contra la IA reemplaza a m1 (la IA de nivel n es el usuario 'ian')
  async createAiGame(userId: string, level: AiLevel, color: Color, timeControl: AiTimeControl, prediction: boolean) {
    const open = await this.openAiGame(userId);
    if (open) throw new ConflictError('AI_GAME_IN_PROGRESS', 'Ya tienes una partida contra la IA sin terminar', undefined, { matchId: open.id });
    const [whiteId, blackId] = color === 'white' ? [userId, `ia${level}`] : [`ia${level}`, userId];
    this.m = { ...record(), whiteId, blackId, timeControl, rated: false, aiPrediction: prediction };
    this.moves = [];
    return this.m.id;
  }
  private open(userId: string, rated: boolean) {
    const m = this.m;
    return m.rated === rated && (m.status === 'pending' || m.status === 'active') && (m.whiteId === userId || m.blackId === userId)
      ? { ...m } : null;
  }
  async openAiGame(userId: string) { return this.open(userId, false); }
  async openRatedMatch(userId: string) { return this.open(userId, true); }
  async takeback(id: string, by: Color, expectedPly: number) {
    const m = this.get(id);
    if (!m) throw matchNotFound();
    if (m.rated) throw notAiMatch();
    if (m.status !== 'pending' && m.status !== 'active') throw matchFinished();
    if (m.ply !== expectedPly) throw stalePly();
    if (turnOf(m.ply) !== by) throw new ConflictError('AI_THINKING', 'Espera a que la IA juegue');
    const target = m.ply - 2;
    if (target < (by === 'white' ? 0 : 1)) throw new ConflictError('NOTHING_TO_UNDO', 'No hay jugadas tuyas para deshacer');
    this.moves = this.moves.filter(x => x.ply <= target);
    const ucis = this.moves.map(x => x.uci);
    const fen = ucis.length ? rules.play(ucis.slice(0, -1), ucis.at(-1)!).fen : record().fen;
    this.touch({ ply: target, fen, takebacks: m.takebacks + 1, turnStartedAt: new Date(), drawOfferBy: null, drawOfferedAt: null });
    this.lease = null;
    return target;
  }
  lease: { ply: number; until: number } | null = null;
  async claimAiTurn(_id: string, ply: number, ms: number) {
    if (this.lease && this.lease.ply === ply && this.lease.until > Date.now()) return false;
    this.lease = { ply, until: Date.now() + ms };
    return true;
  }
}

const player = (id: string, elo: number): PlayerSummary => ({ id, username: id, displayName: null, avatarUrl: null, elo });
const players: PlayerDirectory = {
  getMany: async ids => [player('ana', 1450), player('bob', 1478), ...AI_LEVELS.map(l => player(`ia${l.level}`, l.elo))]
    .filter(p => ids.includes(p.id)),
  findByUsernames: async () => [],
};
const rules = new ChessJsRules();
// los usuarios 'ia1'…'ia5' juegan con el motor
const ai: AiPlayers = { levelOf: async id => (/^ia[1-5]$/.test(id) ? (Number(id[2]) as AiLevel) : null) };

let repo: MemoryArenaRepo;
beforeEach(() => { repo = new MemoryArenaRepo(); });
const move = (userId: string, uci: string, ply: number) => new MakeMove(repo, players, ai, rules).execute(userId, 'm1', { uci, ply });
// desde el inicio; ana lleva blancas
const play = async (...ucis: string[]) => { for (const [i, uci] of ucis.entries()) await move(i % 2 ? 'bob' : 'ana', uci, i); };

describe('MakeMove', () => {
  it('blancas en pending → active y corre el reloj de negras', async () => {
    const { ply, state } = await move('ana', 'e2e4', 0);
    expect(ply).toBe(1);
    expect(state).toMatchObject({ status: 'active', turn: 'black', clock: { running: 'black' }, moves: [{ ply: 1, san: 'e4' }] });
  });

  it('negras en pending → 409 NOT_YOUR_TURN', async () => {
    await expect(move('bob', 'e7e5', 0)).rejects.toMatchObject({ code: 'NOT_YOUR_TURN', status: 409 });
  });

  it('ply viejo → 409 STALE_PLY con meta.currentPly', async () => {
    await play('e2e4');
    await expect(move('bob', 'e7e5', 0)).rejects.toMatchObject({ code: 'STALE_PLY', status: 409, meta: { currentPly: 1 } });
  });

  it('ilegal → 422 ILLEGAL_MOVE', async () => {
    await expect(move('ana', 'e2e5', 0)).rejects.toMatchObject({ code: 'ILLEGAL_MOVE', status: 422 });
  });

  it('coronación sin la pieza → 422 PROMOTION_REQUIRED y la partida no cambia', async () => {
    await play('h2h4', 'g7g5', 'h4g5', 'g8f6', 'g5f6', 'h8g8', 'f6e7', 'g8g6');
    await expect(move('ana', 'e7d8', 8)).rejects.toMatchObject({ code: 'PROMOTION_REQUIRED', status: 422 });
    expect(repo.m.ply).toBe(8);
  });

  it('mate → finished y gana quien movió, por checkmate', async () => {
    await play('e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6');
    expect((await move('ana', 'h5f7', 6)).state).toMatchObject({ status: 'finished', check: true, pollAfterMs: 0,
      result: { winner: 'white', reason: 'checkmate' }, moves: [{ ply: 7, san: 'Qxf7#' }] });
  });

  it('reloj agotado → 409 MATCH_FINISHED y gana el rival', async () => {
    await play('e2e4');
    repo.m.turnStartedAt = new Date(Date.now() - 601_000);   // a negras se les fueron los 10 minutos
    await expect(move('bob', 'e7e5', 1)).rejects.toMatchObject({ code: 'MATCH_FINISHED', status: 409 });
    expect(repo.m).toMatchObject({ status: 'finished', result: 'white', endReason: 'timeout' });
  });

  it('un tercero → 403', async () => {
    await expect(move('eva', 'e2e4', 0)).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });
});

describe('GetGameState', () => {
  const get = (since = 0, etag: string | null = null) => new GetGameState(repo, players, ai).execute('ana', 'm1', since, etag);

  it('ETag por versión; con el mismo ETag → notModified', async () => {
    const r = await get();
    expect(r.etag).toBe('"m-0"');
    expect(await get(0, r.etag)).toEqual({ etag: '"m-0"', aiToMove: false, notModified: true });
  });

  it('since=3 trae solo las jugadas 4 en adelante', async () => {
    await play('e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4');
    expect(await get(3)).toMatchObject({ state: { ply: 5, moves: [{ ply: 4 }, { ply: 5 }] } });
  });

  it('since al día: sin jugadas, pero sabe si hay jaque', async () => {
    await play('e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7');
    expect(await get(7)).toMatchObject({ state: { moves: [], check: true } });
  });
});

describe('Bot de desarrollo (BotTurn dentro de GetGameState)', () => {
  const get = () => new GetGameState(repo, players, ai, new BotTurn(repo)).execute('ana', 'm1', 0, null);
  beforeEach(async () => { repo.bots = ['bob']; await play('e2e4'); });   // bob lleva negras: le toca

  it('rechaza tablas antes de la jugada 10 y las acepta desde ahí', async () => {
    const offer = () => new OfferDraw(repo, players, ai).execute('ana', 'm1');
    await offer();
    repo.m.drawOfferedAt = new Date(Date.now() - 2000);
    expect(await get()).toMatchObject({ state: { status: 'active', drawOffer: null } });
    await offer();
    Object.assign(repo.m, { ply: 20, drawOfferedAt: new Date(Date.now() - 2000) });
    expect(await get()).toMatchObject({ state: { status: 'finished', result: { winner: null, reason: 'agreement' } } });
  });
});

describe('Resign', () => {
  const resign = (userId: string) => new Resign(repo, players, ai).execute(userId, 'm1');

  it('en active gana el rival', async () => {
    await play('e2e4');
    expect(await resign('ana')).toMatchObject({ status: 'finished', result: { winner: 'black', reason: 'resign' } });
  });

  it('en pending → 409 MATCH_NOT_ACTIVE', async () => {
    await expect(resign('ana')).rejects.toMatchObject({ code: 'MATCH_NOT_ACTIVE', status: 409 });
  });
});

describe('Tablas', () => {
  const offer = (userId: string) => new OfferDraw(repo, players, ai).execute(userId, 'm1');
  const answer = () => new AnswerDraw(repo, players, ai);
  beforeEach(async () => { await play('e2e4'); });   // en juego, turno de negras

  it('ofrecer dos veces → 409 DRAW_ALREADY_OFFERED', async () => {
    await offer('ana');
    await expect(offer('bob')).rejects.toMatchObject({ code: 'DRAW_ALREADY_OFFERED', status: 409 });
  });

  it('rechazar sin oferta → 404 NO_DRAW_OFFER', async () => {
    await expect(answer().decline('bob', 'm1')).rejects.toMatchObject({ code: 'NO_DRAW_OFFER', status: 404 });
  });

  it('aceptar la propia → 409 OWN_DRAW_OFFER', async () => {
    await offer('ana');
    await expect(answer().accept('ana', 'm1')).rejects.toMatchObject({ code: 'OWN_DRAW_OFFER', status: 409 });
  });

  it('aceptar la del rival → finished por agreement', async () => {
    await offer('ana');
    expect(await answer().accept('bob', 'm1')).toMatchObject({ status: 'finished', result: { winner: null, reason: 'agreement' } });
  });

  it('una jugada del rival borra la oferta', async () => {
    await offer('ana');
    expect((await move('bob', 'e7e5', 1)).state.drawOffer).toBeNull();
  });
});

describe('Historial', () => {
  const row = (id: string, outcome: Outcome3, hour: number): HistoryRow => ({ id, timeControl: '10+0',
    endedAt: new Date(`2026-10-18T${10 + hour}:00:00Z`), yourColor: 'white', outcome, reason: 'checkmate',
    eloDelta: outcome === 'win' ? 17 : -15, plies: 7, opponentId: 'bob', opponentElo: 1478, rated: true });
  const list = (q: object) => new GetMatchHistory(repo, players).execute('ana', HistoryQuerySchema.parse(q));
  beforeEach(() => { repo.rows = [row('a', 'win', 1), row('b', 'loss', 2), row('c', 'win', 3)]; });

  it('filtro win solo devuelve ganadas, con el ELO del rival en esa partida', async () => {
    const r = await list({ result: 'win' });
    expect(r.items.map(i => i.id)).toEqual(['c', 'a']);
    expect(r.items[0]).toMatchObject({ opponent: { username: 'bob', elo: 1478 } });
  });

  it('limit=2 con 3 partidas da nextBefore, y con ese before sale la tercera', async () => {
    const first = await list({ limit: '2' });
    expect(first.items.map(i => i.id)).toEqual(['c', 'b']);
    const second = await list({ limit: '2', before: first.nextBefore });
    expect(second).toMatchObject({ items: [{ id: 'a' }], nextBefore: null });
  });

  it('limit=99 → 400 con fields.limit', () => {
    expect(zodFields(HistoryQuerySchema.safeParse({ limit: '99' }).error!)).toHaveProperty('limit');
  });

  it('perfil: serie de ELO y resultados con el usuario del rival', async () => {
    expect(await new GetProfileHistory(repo, players).execute('ana', 30)).toMatchObject({
      elo: [{ date: '2026-10-17', elo: 1450 }, { date: '2026-10-18', elo: 1467 }],
      results: [{ id: 'c', outcome: 'win', opponent: 'bob' }, { id: 'b' }, { id: 'a' }] });
  });
});

describe('Revancha', () => {
  const rematch = () => new Rematch(repo);
  beforeEach(async () => { await play('e2e4'); await new Resign(repo, players, ai).execute('bob', 'm1'); });

  it('ofrecer → offered; otra vez → 409; el rival acepta → partida con colores cambiados y el mismo ritmo', async () => {
    expect(await rematch().request('ana', 'm1')).toEqual({ state: 'offered' });
    await expect(rematch().request('ana', 'm1')).rejects.toMatchObject({ code: 'REMATCH_ALREADY_OFFERED', status: 409 });
    expect(await rematch().request('bob', 'm1')).toEqual({ state: 'accepted', matchId: 'm2' });
    expect(repo.created[0]).toMatchObject({ whiteId: 'bob', blackId: 'ana', timeControl: '10+0' });
  });

  it('contra un bot se acepta sola', async () => {
    repo.bots = ['bob'];
    expect(await rematch().request('ana', 'm1')).toEqual({ state: 'accepted', matchId: 'm2' });
  });

  it('en active → 409 MATCH_NOT_FINISHED', async () => {
    repo.m.status = 'active';
    await expect(rematch().request('ana', 'm1')).rejects.toMatchObject({ code: 'MATCH_NOT_FINISHED', status: 409 });
  });

  it('retirar sin oferta → 404 NO_REMATCH_OFFER; con oferta, se retira', async () => {
    await expect(rematch().cancel('ana', 'm1')).rejects.toMatchObject({ code: 'NO_REMATCH_OFFER', status: 404 });
    await rematch().request('ana', 'm1');
    await expect(rematch().cancel('bob', 'm1')).resolves.toBeUndefined();
    expect(repo.m.rematchOfferBy).toBeNull();
  });
});

describe('Contra la IA', () => {
  const noLimit = async () => {};
  const engine = new EngineMovePicker(() => 0.5);
  // ana contra la IA de nivel 1 (rápida); con 'black', la IA abre
  const create = (input: object = {}, rng = () => 0.9) =>
    new CreateAiGame(repo, players, ai, noLimit, rng).execute('ana', CreateAiGameSchema.parse({ level: 1, ...input }));
  const aiTurn = () => new PlayAiTurn(repo, ai, engine, new MakeMove(repo, players, ai, rules)).run('m1');
  const takeback = (ply: number) => new Takeback(repo).execute('ana', 'm1', ply);
  const prediction = (etag: string | null = null) => new GetPrediction(repo, rules, engine, noLimit).execute('ana', 'm1', etag);
  const suggest = (userId: string, fen: string, limit = noLimit) => new SuggestMove(repo, rules, engine, limit).execute(userId, fen, 1);

  describe('CreateAiGame', () => {
    it('con blancas: tu turno, sin ELO, sin reloj y con el nivel', async () => {
      expect(await create({ color: 'white', level: 3 })).toMatchObject({ turn: 'white', yourColor: 'white', rated: false,
        clock: { running: null }, ai: { level: 3, name: 'Alfil', prediction: true, takebacks: 0 } });
    });

    it('al azar con rng 0,9 → negras: le toca a la IA (la ruta la hace jugar) y se consulta cada 700 ms', async () => {
      const state = await create({ color: 'random' });
      expect(state).toMatchObject({ yourColor: 'black', turn: 'white', pollAfterMs: 700 });
    });

    it('otra sin terminar → 409 AI_GAME_IN_PROGRESS con meta.matchId', async () => {
      await create();
      await expect(create()).rejects.toMatchObject({ code: 'AI_GAME_IN_PROGRESS', status: 409, meta: { matchId: 'm1' } });
    });

    it('niveles: recomendado por tu ELO (1450 → Alfil) y la partida sin terminar', async () => {
      const levels = () => new GetAiLevels(repo, players, ai).execute('ana');
      expect(await levels()).toMatchObject({ recommended: 3, activeGame: null });
      await create({ level: 2 });
      expect((await levels()).activeGame).toEqual({ matchId: 'm1', level: 2 });
    });
  });

  describe('PlayAiTurn', () => {
    it('turno de la IA → juega una jugada legal y sube ply', async () => {
      await create({ color: 'black' });
      expect(await aiTurn()).toBe('played');
      expect(repo.m).toMatchObject({ ply: 1, status: 'active' });
      expect(repo.moves[0]!.san).toBeTruthy();
    });

    it('dos a la vez → una juega y la otra recibe busy', async () => {
      await create({ color: 'black' });
      expect((await Promise.all([aiTurn(), aiTurn()])).sort()).toEqual(['busy', 'played']);
      expect(repo.m.ply).toBe(1);
    });

    it('turno del humano o partida entre humanos → not-ai-turn', async () => {
      expect(await aiTurn()).toBe('not-ai-turn');   // m1: ana contra bob
      await play('e2e4');
      expect(await aiTurn()).toBe('not-ai-turn');
    });

    it('la consulta del estado avisa (aiToMove) si la IA lleva 1,5 s sin jugar, también con 304', async () => {
      await create({ color: 'black' });
      const get = (etag: string | null = null) => new GetGameState(repo, players, ai).execute('ana', 'm1', 0, etag);
      expect((await get()).aiToMove).toBe(false);
      repo.m.createdAt = new Date(Date.now() - 2000);
      const r = await get();
      expect(r.aiToMove).toBe(true);
      expect(await get(r.etag)).toMatchObject({ notModified: true, aiToMove: true });
    });

    it('en tu jugada: sin reloj, ai lleno y 700 ms mientras piensa la IA', async () => {
      await create();
      const { state } = await move('ana', 'e2e4', 0);
      expect(state).toMatchObject({ status: 'active', clock: { running: null }, pollAfterMs: 700, ai: { level: 1, name: 'Peón' } });
    });
  });

  describe('Takeback', () => {
    beforeEach(async () => { await create(); await move('ana', 'e2e4', 0); await aiTurn(); });   // ply 2, tu turno

    it('tras tu jugada y la respuesta → 204, ply 0 y cuenta el deshacer', async () => {
      await expect(takeback(2)).resolves.toBeUndefined();
      expect(repo.m).toMatchObject({ ply: 0, takebacks: 1, fen: record().fen });
      expect(repo.moves).toEqual([]);
    });

    it('ply viejo → 409 STALE_PLY con meta.currentPly', async () => {
      await expect(takeback(1)).rejects.toMatchObject({ code: 'STALE_PLY', status: 409, meta: { currentPly: 2 } });
    });

    it('sin jugadas tuyas → 409 NOTHING_TO_UNDO', async () => {
      await takeback(2);
      await expect(takeback(0)).rejects.toMatchObject({ code: 'NOTHING_TO_UNDO', status: 409 });
    });
  });

  it('Takeback en una partida con ELO → 403 NOT_AI_MATCH', async () => {
    await play('e2e4', 'e7e5');
    await expect(takeback(2)).rejects.toMatchObject({ code: 'NOT_AI_MATCH', status: 403 });
  });

  describe('GetPrediction', () => {
    it('200 con ETag "p-<ply>-<deshacer>" y tus 3 jugadas con SAN; mismo ETag → 304 sin llamar al motor', async () => {
      await create();
      const r = await prediction();
      expect(r).toMatchObject({ etag: '"p-0-0"', notModified: false, prediction: { ply: 0 } });
      if (r.notModified) throw new Error('esperaba 200');
      expect(r.prediction.top).toHaveLength(3);
      expect(r.prediction.top[0]).toHaveProperty('san');
      const spy = vi.spyOn(engine, 'predict');
      expect(await prediction(r.etag)).toEqual({ etag: '"p-0-0"', notModified: true });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('turno de la IA → top vacío', async () => {
      await create({ color: 'black' });
      expect(await prediction()).toMatchObject({ prediction: { top: [] } });
    });

    it('partida con ELO → 403 NOT_AI_MATCH', async () => {
      await expect(prediction()).rejects.toMatchObject({ code: 'NOT_AI_MATCH', status: 403 });
    });
  });

  describe('SuggestMove', () => {
    const START = record().fen;

    it('200 con uci y SAN', async () => {
      expect(await suggest('eva', START)).toMatchObject({ uci: expect.any(String), san: expect.any(String) });
    });

    it('FEN que no es una posición (sin reyes) → 400 fields.fen', async () => {
      await expect(suggest('eva', '8/8/8/8/8/8/8/8 w - - 0 1')).rejects.toMatchObject({ status: 400, fields: { fen: expect.any(Array) } });
    });

    it('el FEN de tu partida con ELO en juego, aunque cambie el turno → 403 LIVE_GAME_ANALYSIS', async () => {
      await play('e2e4');
      const fen = repo.m.fen.replace(' b ', ' w ');
      await expect(suggest('ana', fen)).rejects.toMatchObject({ code: 'LIVE_GAME_ANALYSIS', status: 403 });
    });

    it('posición de mate → 422 GAME_OVER', async () => {
      await expect(suggest('eva', 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'))
        .rejects.toMatchObject({ code: 'GAME_OVER', status: 422 });
    });

    it('límite superado → 429 con retryAfterS', async () => {
      const full = async () => { throw new TooManyRequestsError(42); };
      await expect(suggest('eva', START, full)).rejects.toMatchObject({ code: 'RATE_LIMITED', status: 429, meta: { retryAfterS: 42 } });
    });
  });
});
