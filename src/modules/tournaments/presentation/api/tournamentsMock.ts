import { ApiError } from '@/lib/apiClient';
import type { TournamentDetail, TournamentListResponse, TournamentSummary } from '@/modules/tournaments/infrastructure/dto/tournamentSchemas';
import listFx from './__fixtures__/tournaments.list.json';
import runningFx from './__fixtures__/tournament.running.json';
import openFx from './__fixtures__/tournament.open.json';
import finishedFx from './__fixtures__/tournament.finished.json';
import type { WithNow } from './tournamentsApi';

/**
 * Mocks de torneos (NEXT_PUBLIC_API_MOCK=1) con los mismos códigos que la API. Los fixtures salen de las
 * funciones SQL reales de 0009 (la guía dice cómo se generaron) y sus horas se corren a "ahora".
 * Escenario en localStorage 'cpp:mock-tour': ok (por defecto, 201) · full (409 TOURNAMENT_FULL) ·
 * closed (409 TOURNAMENT_CLOSED) · offline (sin red) · limited (429).
 */
const scenario = () => { try { return localStorage.getItem('cpp:mock-tour') ?? 'ok'; } catch { return 'ok'; } };
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Corre todas las horas del fixture para que "ahora" del fixture sea ahora. */
function relativize<T>(value: T, deltaMs: number): T {
  if (typeof value === 'string' && ISO.test(value)) return new Date(Date.parse(value) + deltaMs).toISOString() as T;
  if (Array.isArray(value)) return value.map(v => relativize(v, deltaMs)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, relativize(v, deltaMs)])) as T;
  return value;
}
const delta = Date.now() - Date.parse(listFx.serverNow);
const list = relativize(listFx as unknown as TournamentListResponse, delta);
const details = new Map<string, TournamentDetail>(
  [runningFx, openFx, finishedFx].map(f => { const d = relativize(f.tournament as unknown as TournamentDetail, delta); return [d.id, d]; }));
let version = 1;

const offline = () => { if (scenario() === 'offline') throw new TypeError('Failed to fetch'); };
const now = () => new Date().toISOString();
const summaryOf = (id: string) => list.tournaments.find(t => t.id === id);

export const tournamentsMock = {
  async list(etag: string | null): Promise<WithNow<TournamentListResponse>> {
    await wait(200); offline();
    const tag = `"tl-mock-${version}"`;
    return etag === tag ? { kind: 'not-modified' } : { kind: 'data', data: structuredClone(list), etag: tag, serverNow: now() };
  },
  async detail(id: string, etag: string | null): Promise<WithNow<TournamentDetail>> {
    await wait(200); offline();
    const s = summaryOf(id);
    // los torneos sin fixture propio usan el de su estado, con su nombre e id
    const base = details.get(id) ?? [...details.values()].find(d => d.status === s?.status);
    if (!s || !base) throw new ApiError(404, 'TOURNAMENT_NOT_FOUND', 'El torneo no existe');
    const d: TournamentDetail = { ...base, ...s };
    const tag = `"td-mock-${id}-${version}"`;
    return etag === tag ? { kind: 'not-modified' } : { kind: 'data', data: d, etag: tag, serverNow: now() };
  },
  async join(id: string): Promise<{ created: boolean; tournament: TournamentSummary }> {
    await wait(600); offline();
    const s = summaryOf(id);
    if (!s) throw new ApiError(404, 'TOURNAMENT_NOT_FOUND', 'El torneo no existe');
    if (s.joined) return { created: false, tournament: { ...s } };
    const sc = scenario();
    if (sc === 'limited') throw new ApiError(429, 'RATE_LIMITED', 'Demasiadas solicitudes', undefined, { retryAfterS: 1800 });
    if (sc === 'closed' || s.status !== 'open') throw new ApiError(409, 'TOURNAMENT_CLOSED', 'Las inscripciones ya cerraron: el torneo empezó o se canceló');
    if (sc === 'full' || s.players >= s.size) { s.players = s.size; version++; throw new ApiError(409, 'TOURNAMENT_FULL', 'El torneo está lleno'); }
    s.players++; s.joined = true; version++;
    return { created: true, tournament: { ...s } };
  },
  async leave(id: string): Promise<void> {
    await wait(400); offline();
    const s = summaryOf(id);
    if (!s) throw new ApiError(404, 'TOURNAMENT_NOT_FOUND', 'El torneo no existe');
    if (!s.joined) throw new ApiError(404, 'NOT_REGISTERED', 'No estás inscrito en este torneo');
    if (s.status !== 'open') throw new ApiError(409, 'TOURNAMENT_CLOSED', 'Las inscripciones ya cerraron: el torneo empezó o se canceló');
    s.players--; s.joined = false; version++;
  },
  async registration(id: string) {
    const s = summaryOf(id);
    if (!s?.joined) throw new ApiError(404, 'NOT_REGISTERED', 'No estás inscrito en este torneo');
    return { registration: { tournamentId: id, joinedAt: now(), seed: null } };
  },
};
