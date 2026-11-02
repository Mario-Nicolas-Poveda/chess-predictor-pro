import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { MatchListItem } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import type { CoachSummaryDTO } from '@/modules/coach/infrastructure/dto/coachSchemas';
import fixture from '../api/__fixtures__/summary.json';
import { AccuracyTrend, TrendChart } from '../components/AccuracyTrend';
import { CoachPageView } from '../components/CoachPage';
import { ErrorsByPhase } from '../components/ErrorsByPhase';
import { toAnalyze } from '../components/UnanalyzedGames';
import type { JobView } from '../lib/jobController';
import { trendFloor, trendPct, trendTicks } from '../lib/trend';

const item = (id: string, plies: number, review: MatchListItem['review'] = null) => ({
  id, plies, review, outcome: 'loss', endedAt: '2026-11-20T10:00:00.000Z', opponent: { username: `rival-${id}` },
}) as MatchListItem;

const history = vi.hoisted(() => ({ items: [] as unknown[] }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock('@/modules/arena/presentation/hooks/useMatchHistory', () => ({ useMatchHistory: () => ({ items: history.items, error: null }) }));
vi.mock('../hooks/useCoachJobs', () => ({ useReview: () => ({ view: { kind: 'none' }, request: async () => {} }), useCoachSummary: () => ({}) }));

const summary = fixture.summary as CoachSummaryDTO;
const stats = summary.stats!;
const noop = () => {};
const html = (view: JobView<CoachSummaryDTO>) => renderToStaticMarkup(<CoachPageView view={view} onRetry={noop} onAnalyzed={noop} />);
const empty = { ...summary, status: 'pending', plan: null, stats: null } as CoachSummaryDTO;

describe('CoachPage', () => {
  it('listo: titular, focos, cifras y sin píldora', () => {
    const h = html({ kind: 'ready', data: summary });
    expect(h).toContain(summary.plan!.headline);
    expect(h.match(/<article/g)).toHaveLength(3);
    expect(h).toContain('65 %');
    expect(h).toContain('0,8');
    expect(h).toContain('Entrenador · tus últimas 4 partidas');
    expect(h).not.toContain('Actualizando');
  });

  it('rehaciéndose: se ve el plan anterior con la píldora', () => {
    const h = html({ kind: 'pending', data: { ...summary, status: 'pending' } });
    expect(h).toContain(summary.plan!.headline);
    expect(h).toContain('Actualizando con tus partidas nuevas…');
  });

  it('con pocas partidas: medidor y lista para analizar', () => {
    history.items = [item('a', 8), item('b', 2)];
    const h = html({ kind: 'unavailable', code: 'NOT_ENOUGH_GAMES', message: 'x', meta: { games: 1, needed: 3 } });
    expect(h).toContain('Tu plan aparece con 3 partidas analizadas.');
    expect(h).toContain('role="meter"');
    expect(h).toContain('aria-valuetext="1 de 3"');
    expect(h).toContain('Analizar');
    expect(h).toContain('Muy corta');
  });

  it('sin partidas: invita a jugar', () => {
    history.items = [];
    const h = html({ kind: 'unavailable', code: 'NOT_ENOUGH_GAMES', message: 'x', meta: { games: 0, needed: 3 } });
    expect(h).toContain('vuelve aquí');
    expect(h).toContain('href="/dashboard/play"');
  });

  it.each<[JobView<CoachSummaryDTO>, string]>([
    [{ kind: 'limited', retryAfterS: 60, last: summary }, 'Ya actualizaste tu plan varias veces hoy.'],
    [{ kind: 'offline', last: summary }, 'Sin conexión. Reintentando…'],
    [{ kind: 'failed', data: summary }, 'No se pudo actualizar. Reintentar'],
  ])('con plan anterior %#: sigue a la vista', (view, text) => {
    const h = html(view);
    expect(h).toContain(summary.plan!.headline);
    expect(h).toContain(text);
  });

  it.each<[JobView<CoachSummaryDTO>, string]>([
    [{ kind: 'loading' }, 'aria-busy="true"'],
    [{ kind: 'pending', data: empty }, 'Preparando tu plan…'],
    [{ kind: 'failed', data: empty }, 'No se pudo preparar tu plan.'],
    [{ kind: 'none' }, 'No se pudo preparar tu plan.'],
    [{ kind: 'limited', retryAfterS: 60, last: null }, 'Ya actualizaste tu plan varias veces hoy.'],
    [{ kind: 'offline', last: null }, 'Sin conexión. Reintentando…'],
  ])('sin plan %#', (view, text) => {
    expect(html(view)).toContain(text);
  });
});

describe('toAnalyze', () => {
  it('solo las que no tienen análisis, primero las que se pueden pedir, máximo 10', () => {
    const shorts = Array.from({ length: 12 }, (_, i) => item(`s${i}`, 2));
    const rows = toAnalyze([...shorts, item('ok', 8), item('hecha', 8, { status: 'ready', accuracy: 70 })]);
    expect(rows).toHaveLength(10);
    expect(rows[0]!.id).toBe('ok');
    expect(rows.map(r => r.id)).not.toContain('hecha');
  });
});

describe('AccuracyTrend', () => {
  it('la escala: arranca 10 por debajo de la peor, como mucho en 70', () => {
    expect(trendFloor([72, 68, 75])).toBe(50);
    expect(trendFloor([95, 92])).toBe(70);
    expect(trendFloor([4])).toBe(0);
    expect(trendTicks(70)).toEqual([70, 80, 90, 100]);
    expect(trendPct(75, 50)).toBe(50);
  });

  it('un punto por partida y solo el último con su valor', () => {
    const h = renderToStaticMarkup(<TrendChart points={stats.accuracyTrend} w={400} onOpen={noop} />);
    expect(h.match(/<circle/g)).toHaveLength(4);
    expect(h).toContain('68 %');
    expect(h).not.toContain('75 %');
  });

  it('con 2 partidas no hay línea: se ven los números con su enlace', () => {
    const h = renderToStaticMarkup(<AccuracyTrend points={stats.accuracyTrend.slice(0, 2)} />);
    expect(h).toContain('66 %');
    expect(h).toContain(`/dashboard/partidas/${stats.accuracyTrend[0]!.matchId}?tab=analisis`);
    expect(h).not.toContain('<svg');
  });
});

describe('ErrorsByPhase', () => {
  it('el valor encima de cada barra y la fase mayor en ink', () => {
    const h = renderToStaticMarkup(<ErrorsByPhase data={{ opening: 3, middlegame: 9, endgame: 1 }} />);
    expect(h).toContain('aria-label="Medio juego: 9 errores"');
    expect(h).toContain('aria-label="Final: 1 error"');
    expect(h).toContain('text-ink">Medio juego');
    expect(h).toContain('text-ink-soft">Apertura');
  });

  it('sin errores: ninguna fase resaltada', () => {
    const h = renderToStaticMarkup(<ErrorsByPhase data={{ opening: 0, middlegame: 0, endgame: 0 }} />);
    expect(h).not.toContain('text-ink">');
  });
});
