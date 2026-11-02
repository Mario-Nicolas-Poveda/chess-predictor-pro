import { Chess } from 'chess.js';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooManyRequestsError } from '@/core/shared/errors/AppError';
import { chooseMove } from '@/modules/ai-engine/domain/search';
import { analyseMatch } from '../../domain/analyseMatch';
import type { CoachInput } from '../../domain/coachInput';
import { toPlayedMoves, type StoredMove } from '../../domain/playedMoves';
import type { MatchAnalysis } from '../../domain/types';
import { TemplateCoachWriter } from '../../infrastructure/TemplateCoachWriter';
import { REVIEW_FAILED_MESSAGE, SUMMARY_FAILED_MESSAGE } from '../coachDto';
import { DeleteReview } from '../DeleteReview';
import { GenerateReview } from '../GenerateReview';
import { GenerateSummary } from '../GenerateSummary';
import { GetReview } from '../GetReview';
import { GetSummary } from '../GetSummary';
import type { CoachGame, CoachGames } from '../ports/CoachGames';
import type { CoachWriter } from '../ports/CoachWriter';
import { RequestReview } from '../RequestReview';
import { RequestSummary } from '../RequestSummary';
import { ReviewBadges } from '../ReviewBadges';
import { InMemoryCoachRepository } from './InMemoryCoachRepository';

const ANA = '11111111-aaaa-4000-8000-000000000001', BOB = '22222222-bbbb-4000-8000-000000000002', EVE = '33333333-eeee-4000-8000-000000000003';
const PLIES = 14;

const sanOf = (fen: string, uci: string) => new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;

/** Partida del motor, repetible: nivel 1 con blancas (se equivoca) contra nivel 3. */
function engineMoves(seed: number): StoredMove[] {
  const g = new Chess(), moves: StoredMove[] = [];
  let s = seed;
  const rng = () => (s = (s * 16807) % 2147483647) / 2147483647;
  while (moves.length < PLIES && !g.isGameOver()) {
    const best = chooseMove(g.fen(), moves.length % 2 ? 3 : 1, rng)!;
    const m = g.move({ from: best.uci.slice(0, 2), to: best.uci.slice(2, 4), promotion: best.uci[4] });
    moves.push({ ply: moves.length + 1, uci: best.uci, san: m.san, fenAfter: g.fen(), whiteMs: 500_000, blackMs: 500_000 });
  }
  return moves;
}

// El motor corre una vez por partida: los casos que no prueban el análisis lo reciben hecho
const IDS = ['m1', 'm2', 'm3', 'm4'];
const stored = new Map<string, StoredMove[]>();
const analyses = new Map<string, MatchAnalysis>();
beforeAll(async () => {
  for (const [i, id] of IDS.entries()) {
    stored.set(id, engineMoves(i + 11));
    analyses.set(id, await analyseMatch(toPlayedMoves(stored.get(id)!, true), { sanOf }));
  }
}, 60_000);

let clock: Date;
const now = () => clock;
const tick = (s = 1) => { clock = new Date(clock.getTime() + s * 1000); };

let games: Map<string, CoachGame>;
let repo: InMemoryCoachRepository;
let limited: string[];
let limit: (key: string) => Promise<void>;
let written: CoachInput[];
let requestReview: RequestReview, getReview: GetReview, deleteReview: DeleteReview, generateReview: GenerateReview;
let requestSummary: RequestSummary, getSummary: GetSummary, generateSummary: GenerateSummary, reviewBadges: ReviewBadges;

const game = (id: string, over: Partial<CoachGame> = {}): CoachGame => ({
  id, whiteId: ANA, blackId: BOB, status: 'finished', result: 'black', endReason: 'checkmate',
  endedAt: new Date(`2026-11-0${IDS.indexOf(id) + 1}T15:00:00.000Z`), ply: PLIES, timeControl: '10+0',
  whiteEloBefore: 1200, blackEloBefore: 1250, whiteAi: null, blackAi: null, ...over,
});

beforeEach(() => {
  clock = new Date('2026-11-24T15:00:00.000Z');
  games = new Map(IDS.map(id => [id, game(id)]));
  repo = new InMemoryCoachRepository(id => games.get(id), now);
  for (const [id, a] of analyses) repo.analyses.set(id, a);
  limited = [];
  limit = async key => { limited.push(key); };
  written = [];
  const templates = new TemplateCoachWriter();
  const writer: CoachWriter = { advise: i => { written.push(i); return templates.advise(i); }, plan: i => templates.plan(i) };
  const coachGames: CoachGames = {
    find: async id => games.get(id) ?? null,
    moves: async id => stored.get(id) ?? [],
    eloOf: async () => 1200,
  };
  const quiet = () => {};
  requestReview = new RequestReview(repo, coachGames, k => limit(k), now);
  getReview = new GetReview(repo, coachGames, now);
  deleteReview = new DeleteReview(repo, coachGames);
  generateReview = new GenerateReview(repo, coachGames, writer, sanOf, 1, quiet);
  requestSummary = new RequestSummary(repo, k => limit(k), now);
  getSummary = new GetSummary(repo, now);
  generateSummary = new GenerateSummary(repo, coachGames, writer, quiet);
  reviewBadges = new ReviewBadges(repo);
});

const analysed = async (id: string, user = ANA) => {
  await requestReview.execute(user, id);
  expect(await generateReview.run(id, user)).toBe('done');
  tick();
};

describe('pedir el análisis', () => {
  it('en juego → 409; corta → 422; un tercero → 403; no existe → 404; ninguno gasta el límite', async () => {
    games.set('m1', game('m1', { status: 'active', result: null, endedAt: null }));
    await expect(requestReview.execute(ANA, 'm1')).rejects.toMatchObject({ status: 409, code: 'MATCH_NOT_FINISHED' });
    games.set('m2', game('m2', { ply: 5 }));
    await expect(requestReview.execute(ANA, 'm2')).rejects.toMatchObject({ status: 422, code: 'GAME_TOO_SHORT', meta: { minPlies: 6 } });
    await expect(requestReview.execute(EVE, 'm3')).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    await expect(requestReview.execute(ANA, 'nada')).rejects.toMatchObject({ status: 404, code: 'MATCH_NOT_FOUND' });
    expect(limited).toEqual([]);
  });

  it('GET sin análisis → 404 REVIEW_NOT_FOUND', async () => {
    await expect(getReview.execute(ANA, 'm1', null)).rejects.toMatchObject({ status: 404, code: 'REVIEW_NOT_FOUND' });
  });

  it('nuevo: en cola, con polling y trabajo por hacer', async () => {
    const { review, needsWork } = await requestReview.execute(ANA, 'm1');
    expect(review).toMatchObject({ status: 'pending', pollAfterMs: 1500, analysis: null, coach: null, yourColor: 'white' });
    expect(needsWork).toBe(true);
    expect(limited).toEqual([`coach-review:${ANA}`]);
  });

  it('pedir otra vez devuelve el mismo sin gastar el límite', async () => {
    const first = await requestReview.execute(ANA, 'm1');
    await repo.claimReview('m1', ANA, 120_000);
    const again = await requestReview.execute(ANA, 'm1');
    expect(again.review.matchId).toBe(first.review.matchId);
    expect(again.needsWork).toBe(false);
    expect(limited).toHaveLength(1);
    expect(repo.reviews.size).toBe(1);
  });

  it('borrar en curso → 409', async () => {
    await requestReview.execute(ANA, 'm1');
    await expect(deleteReview.execute(ANA, 'm1')).rejects.toMatchObject({ status: 409, code: 'REVIEW_IN_PROGRESS' });
  });

  it('con el cupo agotado → 429 y no crea nada', async () => {
    limit = async () => { throw new TooManyRequestsError(3600); };
    await expect(requestReview.execute(ANA, 'm1')).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED' });
    expect(repo.reviews.size).toBe(0);
  });
});

describe('el trabajo', () => {
  it('dos a la vez: uno lo hace y el otro se aparta', async () => {
    await requestReview.execute(ANA, 'm1');
    const results = await Promise.all([generateReview.run('m1', ANA), generateReview.run('m1', ANA)]);
    expect(results.sort()).toEqual(['busy', 'done']);
  });

  it('analiza con el motor real y guarda el análisis', async () => {
    repo.analyses.clear();
    await analysed('m1');
    expect(repo.analyses.get('m1')?.plies).toBe(stored.get('m1')?.length);
  }, 20_000);

  it('listo: análisis, consejos y fin del polling', async () => {
    await analysed('m1');
    const r = await getReview.execute(ANA, 'm1', null);
    if (r.notModified) throw new Error('debía traer el análisis');
    expect(r.review).toMatchObject({ status: 'ready', yourColor: 'white', pollAfterMs: 0, error: null, coach: { source: 'template', model: null } });
    const a = r.review.analysis!;
    expect(a.winWhite).toHaveLength(a.moves.length + 1);
    const mine = a.moves.filter(m => m.color === 'white').map(m => m.ply);
    expect(a.keyMoments.length).toBeGreaterThan(0);
    for (const ply of a.keyMoments) expect(mine).toContain(ply);
    const plies = a.moves.map(m => m.ply);
    for (const t of r.review.coach!.tips) for (const ply of t.plies) expect(plies).toContain(ply);
  });

  it('mismo ETag → 304', async () => {
    await analysed('m1');
    const { etag } = await getReview.execute(ANA, 'm1', null);
    expect(await getReview.execute(ANA, 'm1', etag)).toMatchObject({ notModified: true, etag });
  });

  it('el ETag cambia mientras avanza el trabajo', async () => {
    await requestReview.execute(ANA, 'm1');
    const { etag } = await getReview.execute(ANA, 'm1', null);
    await generateReview.run('m1', ANA);
    expect((await getReview.execute(ANA, 'm1', etag)).etag).not.toBe(etag);
  });

  it('POST con todo listo → ready, sin trabajo ni límite', async () => {
    await analysed('m1');
    limited.length = 0;
    const { review, needsWork } = await requestReview.execute(ANA, 'm1');
    expect(review.status).toBe('ready');
    expect(review.analysis).not.toBeNull();
    expect(needsWork).toBe(false);
    expect(limited).toEqual([]);
  });

  it('el otro jugador pide el suyo y no se vuelve a analizar', async () => {
    await analysed('m1');
    const save = vi.spyOn(repo, 'saveAnalysis');
    await analysed('m1', BOB);
    expect(save).not.toHaveBeenCalled();
    const r = await getReview.execute(BOB, 'm1', null);
    if (r.notModified) throw new Error('debía traer el análisis');
    expect(r.review.yourColor).toBe('black');
    expect(written[1]?.jugador).toMatchObject({ color: 'negras', resultado: 'victoria' });
  });

  it('el consejo ve las partidas de antes, no las de después', async () => {
    await analysed('m3');
    await analysed('m1');
    await analysed('m2');
    expect(written[0]?.historial).toBeNull();
    expect(written[1]?.historial).toBeNull();
    expect(written[2]?.historial?.partidasAnalizadas).toBe(1);
  });

  it('al escritor no le llegan ids ni nombres', async () => {
    await analysed('m1');
    await analysed('m2');
    const json = JSON.stringify(written);
    for (const secret of [ANA, BOB, 'm1', 'm2']) expect(json).not.toContain(`"${secret}"`);
    expect(json).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-|@/);
  });

  it('contra la IA: nombra el nivel y no trae ELO del rival', async () => {
    games.set('m1', game('m1', { blackAi: 3, blackEloBefore: 1400, timeControl: 'none' }));
    await analysed('m1');
    expect(written[0]?.jugador).toMatchObject({ rival: 'IA nivel Alfil', ritmo: 'sin reloj' });
    expect((await repo.findReview('m1', ANA))?.facts?.opponent).toBe('ai');
  });

  it('el ELO de la partida; si falta, el actual', async () => {
    await analysed('m1');
    expect(written[0]?.jugador.eloAproximado).toBe(1200);
    games.set('m2', game('m2', { whiteEloBefore: null }));
    await analysed('m2');
    expect(written[1]?.jugador.eloAproximado).toBe(1200);
  });

  it('una partida con tablas no es derrota', async () => {
    games.set('m1', game('m1', { result: 'draw', endReason: 'agreement' }));
    await analysed('m1');
    expect((await repo.findReview('m1', ANA))?.facts).toMatchObject({ result: 'draw', reason: 'agreement' });
  });
});

describe('el plan', () => {
  const three = async () => { await analysed('m1'); await analysed('m2'); await analysed('m3'); };
  const ready = async () => {
    await three();
    await requestSummary.execute(ANA);
    expect(await generateSummary.run(ANA)).toBe('done');
    tick();
  };
  const summary = async () => {
    const r = await getSummary.execute(ANA, null);
    if (r.notModified) throw new Error('debía traer el plan');
    return r.summary;
  };

  it('con 2 partidas → 422 con cuántas lleva, sin gastar el límite', async () => {
    await analysed('m1');
    await analysed('m2');
    limited.length = 0;
    await expect(requestSummary.execute(ANA)).rejects.toMatchObject({ status: 422, code: 'NOT_ENOUGH_GAMES', meta: { games: 2, needed: 3 } });
    expect(limited).toEqual([]);
  });

  it('GET sin plan → 404 SUMMARY_NOT_FOUND', async () => {
    await expect(getSummary.execute(ANA, null)).rejects.toMatchObject({ status: 404, code: 'SUMMARY_NOT_FOUND' });
  });

  it('con 3: en cola y luego listo', async () => {
    await three();
    const { summary: s, needsWork } = await requestSummary.execute(ANA);
    expect(s).toMatchObject({ status: 'pending', pollAfterMs: 1500, stale: false, plan: null });
    expect(needsWork).toBe(true);
    expect(await generateSummary.run(ANA)).toBe('done');
    expect(await summary()).toMatchObject({ status: 'ready', basedOn: 3, stale: false, pollAfterMs: 0, plan: { source: 'template' } });
    expect((await summary()).stats?.accuracyTrend).toHaveLength(3);
  });

  it('al día: no se rehace ni gasta el límite', async () => {
    await ready();
    limited.length = 0;
    const version = (await summary()).version;
    const { summary: s, needsWork } = await requestSummary.execute(ANA);
    expect(s).toMatchObject({ status: 'ready', version });
    expect(needsWork).toBe(false);
    expect(limited).toEqual([]);
  });

  it('mismo ETag → 304', async () => {
    await ready();
    const { etag } = await getSummary.execute(ANA, null);
    expect(await getSummary.execute(ANA, etag)).toMatchObject({ notModified: true, etag });
  });

  it('una partida nueva cambia el ETag y lo marca viejo', async () => {
    await ready();
    const { etag } = await getSummary.execute(ANA, null);
    await analysed('m4');
    const r = await getSummary.execute(ANA, etag);
    expect(r.notModified).toBe(false);
    expect(await summary()).toMatchObject({ status: 'ready', stale: true, basedOn: 3 });
  });

  it('rehacerlo deja el plan anterior a la vista hasta que termina', async () => {
    await ready();
    await analysed('m4');
    limited.length = 0;
    const { summary: s, needsWork } = await requestSummary.execute(ANA);
    expect(s).toMatchObject({ status: 'pending', basedOn: 3 });
    expect(s.plan).not.toBeNull();
    expect(needsWork).toBe(true);
    expect(limited).toEqual([`coach-summary:${ANA}`]);
    await generateSummary.run(ANA);
    expect(await summary()).toMatchObject({ status: 'ready', basedOn: 4, stale: false });
  });

  it('con el cupo agotado → 429', async () => {
    await three();
    limit = async () => { throw new TooManyRequestsError(3600); };
    await expect(requestSummary.execute(ANA)).rejects.toMatchObject({ status: 429 });
    expect(repo.summaries.size).toBe(0);
  });
});

describe('las insignias', () => {
  it('ready con precisión; en cola sin ella; sin análisis no aparece', async () => {
    await analysed('m1');
    await requestReview.execute(ANA, 'm2');
    const badges = await reviewBadges.execute(ANA, ['m1', 'm2', 'm3']);
    expect(badges.get('m1')).toEqual({ status: 'ready', accuracy: expect.any(Number) });
    expect(badges.get('m2')).toEqual({ status: 'pending', accuracy: null });
    expect(badges.has('m3')).toBe(false);
  });

  it('una página vacía no consulta', async () => {
    const badges = vi.spyOn(repo, 'badges');
    expect((await reviewBadges.execute(ANA, [])).size).toBe(0);
    expect(badges).not.toHaveBeenCalled();
  });
});

describe('borrar', () => {
  it('borra los consejos y conserva el análisis del motor', async () => {
    await analysed('m1');
    await deleteReview.execute(ANA, 'm1');
    expect(await repo.findReview('m1', ANA)).toBeNull();
    expect(repo.analyses.has('m1')).toBe(true);
  });

  it('otra vez → 404; un tercero → 403', async () => {
    await analysed('m1');
    await deleteReview.execute(ANA, 'm1');
    await expect(deleteReview.execute(ANA, 'm1')).rejects.toMatchObject({ status: 404, code: 'REVIEW_NOT_FOUND' });
    await expect(deleteReview.execute(EVE, 'm1')).rejects.toMatchObject({ status: 403 });
  });
});

describe('los fallos', () => {
  const failing = () => {
    repo.analyses.delete('m1');
    return vi.spyOn(repo, 'saveAnalysis').mockRejectedValue(new Error('secreto interno de la BD'));
  };

  it('con la BD caída, 3 intentos y queda failed; el 4.º ni entra', async () => {
    failing();
    await requestReview.execute(ANA, 'm1');
    expect(await generateReview.run('m1', ANA)).toBe('failed');
    expect((await repo.findReview('m1', ANA))?.status).toBe('pending');
    expect(await generateReview.run('m1', ANA)).toBe('failed');
    expect(await generateReview.run('m1', ANA)).toBe('failed');
    expect((await repo.findReview('m1', ANA))?.status).toBe('failed');
    expect(await generateReview.run('m1', ANA)).toBe('busy');
  }, 30_000);

  it('el usuario ve un mensaje fijo, no el interno', async () => {
    failing();
    await requestReview.execute(ANA, 'm1');
    for (let i = 0; i < 3; i++) await generateReview.run('m1', ANA);
    const r = await getReview.execute(ANA, 'm1', null);
    if (r.notModified) throw new Error('debía traer el error');
    expect(r.review).toMatchObject({ status: 'failed', error: REVIEW_FAILED_MESSAGE, pollAfterMs: 0, analysis: null });
    expect(JSON.stringify(r.review)).not.toContain('secreto');
    expect((await repo.findReview('m1', ANA))?.error).toContain('secreto');
  }, 30_000);

  it('pedir otra vez lo pone en cola, y esta vez sale', async () => {
    const save = failing();
    await requestReview.execute(ANA, 'm1');
    for (let i = 0; i < 3; i++) await generateReview.run('m1', ANA);
    limited.length = 0;
    const again = await requestReview.execute(ANA, 'm1');
    expect(again.review.status).toBe('pending');
    expect(again.needsWork).toBe(true);
    expect(limited).toHaveLength(1);
    save.mockRestore();
    expect(await generateReview.run('m1', ANA)).toBe('done');
  }, 30_000);

  it('un plan que falla también tiene mensaje fijo y se puede volver a pedir', async () => {
    await analysed('m1'); await analysed('m2'); await analysed('m3');
    await requestSummary.execute(ANA);
    const save = vi.spyOn(repo, 'finishSummary').mockRejectedValue(new Error('secreto interno de la BD'));
    for (let i = 0; i < 3; i++) expect(await generateSummary.run(ANA)).toBe('failed');
    const r = await getSummary.execute(ANA, null);
    if (r.notModified) throw new Error('debía traer el error');
    expect(r.summary).toMatchObject({ status: 'failed', error: SUMMARY_FAILED_MESSAGE });
    expect(JSON.stringify(r.summary)).not.toContain('secreto');
    save.mockRestore();
    expect((await requestSummary.execute(ANA)).summary.status).toBe('pending');
    expect(await generateSummary.run(ANA)).toBe('done');
  });
});

describe('la red de seguridad', () => {
  it('con el permiso vigente el GET no relanza; vencido, sí', async () => {
    await requestReview.execute(ANA, 'm1');
    await repo.claimReview('m1', ANA, 120_000);
    tick(60);
    expect((await getReview.execute(ANA, 'm1', null)).needsWork).toBe(false);
    tick(61);
    expect((await getReview.execute(ANA, 'm1', null)).needsWork).toBe(true);
  });

  it('lo relanza aunque responda 304', async () => {
    await requestReview.execute(ANA, 'm1');
    const { etag } = await getReview.execute(ANA, 'm1', null);
    expect(await getReview.execute(ANA, 'm1', etag)).toMatchObject({ notModified: true, needsWork: true });
  });

  it('un proceso muerto no bloquea: al vencer el permiso, otro lo toma', async () => {
    await requestReview.execute(ANA, 'm1');
    await repo.claimReview('m1', ANA, 120_000);
    expect(await generateReview.run('m1', ANA)).toBe('busy');
    tick(121);
    expect(await generateReview.run('m1', ANA)).toBe('done');
  });

  it('el plan en cola sin dueño también se relanza', async () => {
    await analysed('m1'); await analysed('m2'); await analysed('m3');
    await requestSummary.execute(ANA);
    expect((await getSummary.execute(ANA, null)).needsWork).toBe(true);
    await repo.claimSummary(ANA, 60_000);
    expect((await getSummary.execute(ANA, null)).needsWork).toBe(false);
    tick(61);
    expect((await getSummary.execute(ANA, null)).needsWork).toBe(true);
  });
});
