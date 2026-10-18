import { beforeEach, describe, expect, it } from 'vitest';
import type { PlayerDirectory } from '@/modules/matchmaking/domain/PlayerDirectory';
import type { PlayerSummary } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import type { ArenaRepository, CommitMove } from '../../domain/ArenaRepository';
import { eloDelta } from '../../domain/elo';
import { matchNotActive, matchNotFound, noDrawOffer, ownDrawOffer, stalePly } from '../../domain/errors';
import { other, turnOf, type MatchRecord, type MoveRecord } from '../../domain/Match';
import { ChessJsRules } from '../../infrastructure/ChessJsRules';
import type { Color, EndReason } from '../../infrastructure/dto/arenaSchemas';
import { GreedyMovePicker } from '../../infrastructure/GreedyMovePicker';
import { AnswerDraw } from '../AnswerDraw';
import { BotTurn } from '../BotTurn';
import { GetGameState } from '../GetGameState';
import { MakeMove } from '../MakeMove';
import { OfferDraw } from '../OfferDraw';
import { Resign } from '../Resign';

const record = (): MatchRecord => ({
  id: 'm1', whiteId: 'ana', blackId: 'bob', timeControl: '10+0', status: 'pending', createdAt: new Date(),
  version: 0, ply: 0, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  whiteMs: 600_000, blackMs: 600_000, incrementMs: 0, turnStartedAt: null, startedAt: null, endedAt: null,
  result: null, endReason: null, drawOfferBy: null, drawOfferedAt: null, rematchOfferBy: null, rematchOfferedAt: null, rematchId: null,
  whiteEloBefore: null, blackEloBefore: null, whiteEloAfter: null, blackEloAfter: null,
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
  async acceptDraw(id: string, by: Color) {
    const m = this.get(id);
    if (!m) throw matchNotFound();
    if (m.status !== 'active') throw matchNotActive();
    if (!m.drawOfferBy) throw noDrawOffer();
    if (m.drawOfferBy === by) throw ownDrawOffer();
    this.close('draw', 'agreement');
  }
}

const player = (id: string, elo: number): PlayerSummary => ({ id, username: id, displayName: null, avatarUrl: null, elo });
const players: PlayerDirectory = {
  getMany: async ids => [player('ana', 1450), player('bob', 1478)].filter(p => ids.includes(p.id)),
  findByUsernames: async () => [],
};
const rules = new ChessJsRules();

let repo: MemoryArenaRepo;
beforeEach(() => { repo = new MemoryArenaRepo(); });
const move = (userId: string, uci: string, ply: number) => new MakeMove(repo, players, rules).execute(userId, 'm1', { uci, ply });
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
  const get = (since = 0, etag: string | null = null) => new GetGameState(repo, players).execute('ana', 'm1', since, etag);

  it('ETag por versión; con el mismo ETag → notModified', async () => {
    const r = await get();
    expect(r.etag).toBe('"m-0"');
    expect(await get(0, r.etag)).toEqual({ etag: '"m-0"', notModified: true });
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
  const get = () => new GetGameState(repo, players, new BotTurn(repo, new MakeMove(repo, players, rules), new GreedyMovePicker()))
    .execute('ana', 'm1', 0, null);
  beforeEach(async () => { repo.bots = ['bob']; await play('e2e4'); });   // bob lleva negras: le toca

  it('mueve al consultar si su turno empezó hace más de 0,7 s', async () => {
    repo.m.turnStartedAt = new Date(Date.now() - 1000);
    expect(await get()).toMatchObject({ state: { ply: 2, turn: 'white' } });
  });

  it('antes de 0,7 s no mueve', async () => {
    expect(await get()).toMatchObject({ state: { ply: 1 } });
  });

  it('rechaza tablas antes de la jugada 10 y las acepta desde ahí', async () => {
    const offer = () => new OfferDraw(repo, players).execute('ana', 'm1');
    await offer();
    repo.m.drawOfferedAt = new Date(Date.now() - 2000);
    expect(await get()).toMatchObject({ state: { status: 'active', drawOffer: null } });
    await offer();
    Object.assign(repo.m, { ply: 20, drawOfferedAt: new Date(Date.now() - 2000) });
    expect(await get()).toMatchObject({ state: { status: 'finished', result: { winner: null, reason: 'agreement' } } });
  });
});

describe('Resign', () => {
  const resign = (userId: string) => new Resign(repo, players).execute(userId, 'm1');

  it('en active gana el rival', async () => {
    await play('e2e4');
    expect(await resign('ana')).toMatchObject({ status: 'finished', result: { winner: 'black', reason: 'resign' } });
  });

  it('en pending → 409 MATCH_NOT_ACTIVE', async () => {
    await expect(resign('ana')).rejects.toMatchObject({ code: 'MATCH_NOT_ACTIVE', status: 409 });
  });
});

describe('Tablas', () => {
  const offer = (userId: string) => new OfferDraw(repo, players).execute(userId, 'm1');
  const answer = () => new AnswerDraw(repo, players);
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
