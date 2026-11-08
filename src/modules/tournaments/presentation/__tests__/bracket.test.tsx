import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { exitCopy } from '@/modules/arena/presentation/game/arenaPanel';
import type { GameState } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import type { TournamentDetail } from '@/modules/tournaments/infrastructure/dto/tournamentSchemas';
import listFx from '../api/__fixtures__/tournaments.list.json';
import finishedFx from '../api/__fixtures__/tournament.finished.json';
import openFx from '../api/__fixtures__/tournament.open.json';
import runningFx from '../api/__fixtures__/tournament.running.json';
import { BracketTabs, nextTab } from '../components/Bracket';
import { bannerOf, stagesOf, TournamentView, youIdOf } from '../components/TournamentPage';
import { deadlinesOf } from '../hooks/useTournament';
import { gameLabel, nextGameText } from '../lib/bracketText';
import { fmtCountdown } from '../lib/deadline';

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'x' }) }));

const running = runningFx.tournament as unknown as TournamentDetail;
const open = openFx.tournament as unknown as TournamentDetail;
const finished = finishedFx.tournament as unknown as TournamentDetail;
const NOW = Date.parse(runningFx.serverNow);
const label = (d: TournamentDetail, r: number, slot: number) => {
  const round = d.rounds[r]!;
  return gameLabel(round.games.find(g => g.slot === slot)!, round.name, NOW);
};

describe('textos de la llave (respuestas reales del servidor)', () => {
  it('los seis textos', () => {
    expect(label(running, 0, 1)).toBe('Cuartos, partida 1: sebas_rey con blancas contra mario_p con negras. Lista · sebas_rey tiene 4:32 para jugar');
    expect(label(running, 0, 2)).toBe('Cuartos, partida 2: jp_torres con blancas contra vale.alfil con negras. En juego · jugada 12');
    expect(label(running, 0, 4)).toBe('Cuartos, partida 4: nicole_e4 con blancas contra dani_fianchetto con negras. nicole_e4 no jugó: W.O.');
    expect(label(running, 1, 2)).toBe('Semifinal, partida 2: por definir contra dani_fianchetto. Por definir');
    expect(label(finished, 1, 1)).toBe('Final, partida 1: caro.dama con blancas contra ana_r con negras. Ganó caro.dama');
    expect(label(open, 0, 1)).toBe('Cuartos, partida 1: ana_r, sin rival. Pasaría directo');
  });

  it('tu partida con negras: 4:32 y "Revisando el plazo…" al vencer', () => {
    const next = listFx.next as Parameters<typeof nextGameText>[0];
    const at = Date.parse(listFx.serverNow);
    const t = nextGameText(next, at);
    expect(`${t.title} · ${t.clock}`).toBe('Tu partida está lista · 4:32');
    expect(nextGameText(next, at + 300_000).title).toBe('Revisando el plazo…');
  });

  it('fmtCountdown', () => {
    expect(fmtCountdown(272_000)).toBe('4:32');
    expect(fmtCountdown(59_100)).toBe('1:00');
    expect(fmtCountdown(5000)).toBe('5 s');
    expect(fmtCountdown(3_900_000)).toBe('1 h 05 min');
    expect(fmtCountdown((2 * 86_400 + 3 * 3600) * 1000)).toBe('2 d 3 h');
  });
});

describe('pestañas por ronda (celular)', () => {
  it('flechas con vuelta, Inicio y Fin', () => {
    expect(nextTab('ArrowRight', 2, 3)).toBe(0);
    expect(nextTab('ArrowLeft', 0, 3)).toBe(2);
    expect(nextTab('Home', 2, 3)).toBe(0);
    expect(nextTab('End', 0, 3)).toBe(2);
    expect(nextTab('Enter', 0, 3)).toBeNull();
  });

  it('abre en la ronda pedida con aria-selected y tabIndex', () => {
    const html = renderToStaticMarkup(<BracketTabs rounds={running.rounds} youId={null} nowMs={NOW} initial={1} />);
    expect(html).toMatch(/role="tab"[^>]*aria-selected="false"[^>]*tabindex="-1"[^>]*>Cuartos</);
    expect(html).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*tabindex="0"[^>]*>Semis</);
  });
});

describe('página de llaves', () => {
  it('etapas, tu id por la siembra y los plazos a vigilar', () => {
    expect(stagesOf(running)).toEqual({ labels: ['Inscripciones', 'Cuartos', 'Semifinal', 'Final', 'Terminado'], current: 1 });
    expect(stagesOf(finished)).toEqual({ labels: ['Inscripciones', 'Semifinal', 'Final', 'Terminado'], current: 3 });
    expect(youIdOf(running)).toBe(running.entrants.find(e => e.username === 'mario_p')?.id);
    expect(deadlinesOf(running)).toEqual(['2026-11-03T21:20:32.214Z']);
    expect(deadlinesOf(open)).toEqual([open.startsAt]);
  });

  it('avisos: tu partida lista, abierto sin inscribirte, terminado', () => {
    expect(bannerOf(running, NOW)).toMatchObject({ title: 'Tu partida está lista', clock: '4:32', accent: true, cta: { label: 'Entrar a la partida' } });
    expect(bannerOf(open, NOW)?.cta?.href).toBe('/dashboard/tournaments');
    expect(bannerOf(finished, NOW)).toMatchObject({ title: 'Terminó el torneo: quedaste fuera en semifinal', text: 'Ganaste 0, empataste 0 y perdiste 1.' });
    const noshow: TournamentDetail = { ...running, rounds: running.rounds.map((r, i) => (i ? r : { ...r, games: r.games.map(g => (g.slot === 1
      ? { ...g, state: 'done' as const, decidedBy: 'noshow' as const, deadline: null, top: { ...g.top, score: '1' as const, advanced: true }, bottom: { ...g.bottom, score: 'W.O.' as const } } : g)) })) };
    expect(bannerOf(noshow, NOW)?.title).toBe('Perdiste tu partida por W.O.');
  });

  it('la vista: 404, sin conexión con el último dato y tu partida marcada', () => {
    const leave = { ask: false, busy: false, msg: null, onAsk: () => {}, onConfirm: () => {} };
    expect(renderToStaticMarkup(<TournamentView data={null} problem="not-found" nowMs={NOW} minsAgo={1} onRetry={() => {}} leave={leave} />)).toContain('Este torneo no existe.');
    const html = renderToStaticMarkup(<TournamentView data={running} problem="offline" nowMs={NOW} minsAgo={2} onRetry={() => {}} leave={leave} />);
    expect(html).toContain('Sin conexión. Mostramos las llaves de hace 2 min y reintentamos solos.');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('>Tú</span>');
    expect(html).toContain('aria-label="Cuartos, partida 1: sebas_rey con blancas contra mario_p con negras. Lista · sebas_rey tiene 4:32 para jugar"');
  });
});

describe('arena: salir de una partida de torneo pendiente', () => {
  const s = { status: 'pending', ai: null, ply: 0, you: { elo: 1300 }, opponent: { username: 'sebas_rey', elo: 1688 },
    tournament: { id: 't', name: 'T', stage: { round: 1, rounds: 3, name: 'Cuartos' }, deadline: null } } as unknown as GameState;
  it('no cancela: con negras, "ganas por W.O."; con blancas, "pierdes por W.O."', () => {
    expect(exitCopy({ ...s, yourColor: 'black' })).toMatchObject({ action: 'leave', text: expect.stringContaining('ganas por W.O.') });
    expect(exitCopy({ ...s, yourColor: 'white' })).toMatchObject({ action: 'leave', text: expect.stringContaining('pierdes por W.O.') });
    expect(exitCopy({ ...s, yourColor: 'white', tournament: null }).action).toBe('cancel');
  });
});
