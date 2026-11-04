import { describe, expect, it, vi } from 'vitest';
import { TooManyRequestsError } from '@/core/shared/errors/AppError';
import type { RateLimiter } from '@/core/shared/http/rateLimit';
import fxFinished from '../../infrastructure/__tests__/fixtures/fx_finished.json';
import fxListQuarters from '../../infrastructure/__tests__/fixtures/fx_list_quarters.json';
import fxOpen from '../../infrastructure/__tests__/fixtures/fx_open.json';
import fxQuarters from '../../infrastructure/__tests__/fixtures/fx_quarters.json';
import fxSemis from '../../infrastructure/__tests__/fixtures/fx_semis.json';
import type { TournamentRepository } from '../ports/TournamentRepository';
import { toListResponse, toTournamentDetail } from '../tournamentDto';
import { GetTournament, JoinTournament, ListTournaments } from '../TournamentUseCases';

vi.mock('server-only', () => ({}));
vi.mock('@/core/shared/db/supabaseAdmin', () => ({ supabaseAdmin: {} }));
const { toListItem, toNext, toTournamentRecord } = await import('../../infrastructure/SupabaseTournamentRepository');

const MARIO = '545426c0-b21a-43e2-abb2-c36d32feb03c';
const now = new Date('2026-11-03T21:10:18Z');   // el abierto empieza 12 min después
const detail = (fx: unknown, user = MARIO) => toTournamentDetail(toTournamentRecord(fx), user, now);
const game = (d: ReturnType<typeof detail>, round: number, slot: number) => d.rounds[round - 1]!.games[slot - 1]!;
const name = (s: { player: { username: string } | null }) => s.player?.username ?? null;

describe('toTournamentDetail (lo que devuelve tour_detail)', () => {
  it('abierto: 7 inscritos → llave de 8 de vista previa; la siembra 1 pasa directo', () => {
    const d = detail(fxOpen);
    expect(d.rounds).toHaveLength(3);
    expect(game(d, 1, 1)).toMatchObject({ bye: true, state: 'preview' });
    expect(name(game(d, 1, 1).top)).toBe('sebas_rey');
    const g = d.rounds[0]!.games.find(x => name(x.bottom) === 'mario_p')!;
    expect([g.top.player?.seed, name(g.top), g.bottom.player?.seed]).toEqual([2, 'caro.dama', 7]);
    expect(d.pollAfterMs).toBe(60_000);
  });

  it('cuartos: lista, W.O., por definir y tu próxima partida', () => {
    const d = detail(fxQuarters);
    expect(game(d, 1, 1).state).toBe('ready');
    expect(game(d, 1, 1).deadline).toEqual(expect.any(String));
    expect(game(d, 1, 4)).toMatchObject({ state: 'done', decidedBy: 'noshow', top: { score: 'W.O.' }, bottom: { advanced: true } });
    expect(game(d, 2, 2).state).toBe('tbd');
    expect(name(game(d, 2, 2).bottom)).toBe('dani_fianchetto');
    expect(d.you.nextMatchId).toEqual(expect.any(String));
  });

  it('semis: arriba quien viene de arriba (mario con negras); final por definir con caro abajo', () => {
    const d = detail(fxSemis);
    expect([name(game(d, 2, 1).top), game(d, 2, 1).top.color, name(game(d, 2, 1).bottom)]).toEqual(['mario_p', 'black', 'vale.alfil']);
    expect(game(d, 3, 1).state).toBe('tbd');
    expect(name(game(d, 3, 1).bottom)).toBe('caro.dama');
  });

  it('terminado: tablas en la semifinal (pasa negras), campeona y sin sondeo', () => {
    const d = detail(fxFinished);
    expect(game(d, 2, 1)).toMatchObject({ top: { score: '½', advanced: true }, bottom: { score: '½', advanced: false } });
    expect(d.you.alive).toBe(false);
    expect(d.winner?.username).toBe('caro.dama');
    expect(d.pollAfterMs).toBe(0);
  });
});

describe('toListResponse (lo que devuelve tour_list)', () => {
  it('con partida pendiente: Cuartos, negras y sondeo en vivo', () => {
    const r = toListResponse(fxListQuarters.tournaments.map(toListItem), toNext(fxListQuarters.next), now);
    expect(r.next).toMatchObject({ stage: { name: 'Cuartos' }, color: 'black' });
    expect(r.pollAfterMs).toBe(15_000);
  });
});

const repo = (over: Partial<TournamentRepository> = {}): TournamentRepository => ({
  list: async () => ({ tournaments: fxListQuarters.tournaments.map(toListItem), next: toNext(fxListQuarters.next) }),
  detail: async id => { if (id !== fxQuarters.id) throw Object.assign(new Error(), { code: 'TOURNAMENT_NOT_FOUND', status: 404 }); return toTournamentRecord(fxQuarters); },
  join: async () => 'created', leave: async () => {}, create: async () => fxQuarters.id,
  ...over,
});

describe('casos de uso', () => {
  it('GetTournament: 200, luego 304 con W/; otro usuario → otro ETag; id desconocido → 404', async () => {
    const uc = new GetTournament(repo(), () => now);
    const a = await uc.execute(MARIO, fxQuarters.id, null);
    expect(a.notModified).toBe(false);
    expect((await uc.execute(MARIO, fxQuarters.id, `W/${a.etag}`)).notModified).toBe(true);
    expect((await uc.execute('otro', fxQuarters.id, null)).etag).not.toBe(a.etag);
    await expect(uc.execute(MARIO, 'nope', null)).rejects.toMatchObject({ code: 'TOURNAMENT_NOT_FOUND', status: 404 });
  });

  it('ListTournaments: 304 con el mismo ETag', async () => {
    const uc = new ListTournaments(repo(), () => now);
    const a = await uc.execute(MARIO, null);
    expect(await uc.execute(MARIO, a.etag)).toEqual({ notModified: true, etag: a.etag });
  });

  it('JoinTournament: límite por usuario; exists → 200; límite agotado → 429 sin inscribir', async () => {
    const limit = vi.fn<RateLimiter>(async () => {});
    const join = vi.fn(async () => 'exists' as const);
    const r = await new JoinTournament(repo({ join }), limit, () => now).execute(MARIO, fxQuarters.id);
    expect(limit).toHaveBeenCalledWith(`tour-join:${MARIO}`, expect.objectContaining({ limit: 30 }));
    expect(r.created).toBe(false);
    join.mockClear();
    const full: RateLimiter = async () => { throw new TooManyRequestsError(60); };
    await expect(new JoinTournament(repo({ join }), full).execute(MARIO, fxQuarters.id)).rejects.toMatchObject({ status: 429 });
    expect(join).not.toHaveBeenCalled();
  });
});
