import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/apiClient';
import type { NextTournamentGame, TournamentListResponse } from '@/modules/tournaments/infrastructure/dto/tournamentSchemas';
import { TournamentsView } from '../components/TournamentsPage';
import type { CardUi } from '../hooks/useTournamentList';
import { joinError, leaveError } from '../hooks/useTournamentList';
import { nextGameText } from '../lib/bracketText';

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

const JUEVES = '59c161ce-c612-4128-82da-3723fa92184a';     // abierto, 5 de 8
const COPA = '983eff34-f5b1-49f5-a9e2-747e3dd49c97';       // abierto, lleno
const SABADO = '7da472fb-5f4a-445d-b1da-e8306b08c130';     // abierto, 2 de 4, inscrito

let scenario = 'ok';
const loadMock = async () => {
  vi.resetModules();
  return (await import('../api/tournamentsMock')).tournamentsMock;
};
const listOf = async (m: Awaited<ReturnType<typeof loadMock>>) => {
  const r = await m.list(null);
  if (r.kind !== 'data') throw new Error('sin datos');
  return r.data;
};

beforeEach(() => {
  vi.useFakeTimers();
  scenario = 'ok';
  vi.stubGlobal('localStorage', { getItem: () => scenario });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

// corre los wait() del mock; el rechazo se atrapa antes de avanzar el reloj (si no, queda "sin manejar")
const run = async <T,>(p: Promise<T>): Promise<T> => {
  const settled = p.then(v => ({ ok: true as const, v }), (e: unknown) => ({ ok: false as const, e }));
  await vi.runAllTimersAsync();
  const r = await settled;
  if (r.ok) return r.v;
  throw r.e;
};

describe('mock de torneos (mismos códigos que la API)', () => {
  it('inscribirse (201) sube los cupos y marca inscrito; otra vez → 200', async () => {
    const m = await loadMock();
    const r = await run(m.join(JUEVES));
    expect(r.created).toBe(true);
    expect(r.tournament).toMatchObject({ players: 6, joined: true });
    expect((await run(m.join(JUEVES))).created).toBe(false);
    expect((await run(listOf(m))).tournaments.find(t => t.id === JUEVES)?.players).toBe(6);
  });

  it('full → 409 TOURNAMENT_FULL y el torneo queda lleno', async () => {
    const m = await loadMock();
    scenario = 'full';
    await expect(run(m.join(JUEVES))).rejects.toMatchObject({ status: 409, code: 'TOURNAMENT_FULL' });
    expect((await run(listOf(m))).tournaments.find(t => t.id === JUEVES)?.players).toBe(8);
  });

  it('closed → 409 TOURNAMENT_CLOSED; la copa llena → TOURNAMENT_FULL', async () => {
    const m = await loadMock();
    await expect(run(m.join(COPA))).rejects.toMatchObject({ code: 'TOURNAMENT_FULL' });
    scenario = 'closed';
    await expect(run(m.join(JUEVES))).rejects.toMatchObject({ code: 'TOURNAMENT_CLOSED' });
  });

  it('salir → 204 y libera el cupo; otra vez → 404 NOT_REGISTERED', async () => {
    const m = await loadMock();
    await run(m.leave(SABADO));
    expect((await run(listOf(m))).tournaments.find(t => t.id === SABADO)).toMatchObject({ players: 1, joined: false });
    await expect(run(m.leave(SABADO))).rejects.toMatchObject({ code: 'NOT_REGISTERED' });
  });
});

describe('mensajes de inscribirse y salir', () => {
  it('cada código con su texto', () => {
    expect(joinError(new ApiError(409, 'TOURNAMENT_FULL', 'x')).text).toBe('Se llenó mientras te inscribías.');
    expect(joinError(new ApiError(409, 'TOURNAMENT_CLOSED', 'x'))).toMatchObject({ text: 'Las inscripciones ya cerraron: el torneo empezó.', closed: true });
    expect(joinError(new ApiError(429, 'RATE_LIMITED', 'x', undefined, { retryAfterS: 1800 })).text).toBe('Demasiados intentos. Prueba en 30 min.');
    expect(joinError(new TypeError('Failed to fetch')).text).toBe('Sin conexión. Reintenta en un momento.');
    expect(leaveError(new ApiError(409, 'TOURNAMENT_CLOSED', 'x')).text).toBe('El torneo ya empezó: no puedes salir.');
  });
});

const NEXT: NextTournamentGame = {
  tournamentId: 't', tournamentName: 'Torneo de prueba', matchId: 'm1', stage: { round: 1, rounds: 3, name: 'Cuartos' }, color: 'black',
  opponent: { id: 'o', username: 'sebas_rey', displayName: null, avatarUrl: null, elo: 1688 }, matchStatus: 'pending', deadline: '2026-11-05T12:04:32Z',
};

describe('aviso de tu partida', () => {
  it('cuenta atrás y "Revisando el plazo…" al llegar a 0', () => {
    const t0 = Date.parse('2026-11-05T12:00:00Z');
    expect(nextGameText(NEXT, t0)).toMatchObject({ title: 'Tu partida está lista', clock: '4:32', cta: 'Entrar a la partida' });
    expect(nextGameText(NEXT, t0 + 272_000)).toMatchObject({ title: 'Revisando el plazo…', clock: null });
    expect(nextGameText({ ...NEXT, matchStatus: 'active' }, t0).title).toBe('Estás jugando: cuartos');
  });
});

describe('TournamentsView', () => {
  const view = async (ui: Record<string, CardUi> = {}, nowMs = Date.now()) => {
    const m = await loadMock();
    const data: TournamentListResponse = await run(listOf(m));
    return renderToStaticMarkup(<TournamentsView data={data} problem={null} ui={ui} nowMs={nowMs}
      onJoin={() => {}} onLeave={() => {}} onAsk={() => {}} onRetry={() => {}} />);
  };

  it('abiertos con cupos y botones; lleno deshabilitado; en juego y terminados con "Ver llaves"', async () => {
    const html = await view();
    expect(html).toMatch(/role="meter" aria-label="Inscritos" aria-valuemin="0" aria-valuemax="8" aria-valuenow="5" aria-valuetext="5 de 8 inscritos"/);
    expect(html).toContain('Inscribirme<span class="sr-only"> en Relámpago del jueves</span>');
    expect(html).toMatch(/<button type="button" disabled=""[^>]*>Lleno<\/button>/);
    expect(html).toContain('Inscrito');
    expect(html).toContain('Salir del torneo');
    expect(html).toContain('cuartos en juego');
    expect(html).toContain('ganó caro.dama');
    expect(html).toContain('href="/dashboard/arena/');
    expect(html.match(/role="status"/g)?.length).toBe(3);      // uno por tarjeta abierta
  });

  it('inscribiendo, confirmación de salir y 409 cerrado', async () => {
    const html = await view({
      [JUEVES]: { busy: 'join' },
      [SABADO]: { ask: true },
      [COPA]: { closed: true, msg: { text: 'Las inscripciones ya cerraron: el torneo empezó.', bad: true } },
    });
    expect(html).toMatch(/aria-disabled="true"[^>]*>Inscribiendo…/);
    expect(html).toContain('¿Salir del torneo? Liberas tu cupo.');
    expect(html).toContain('Sí, salir');
    expect(html).toContain(`href="/dashboard/tournaments/${COPA}"`);
    expect(html).toContain('>Las inscripciones ya cerraron: el torneo empezó.</p>');
  });
});
