import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameReviewDTO } from '@/modules/coach/infrastructure/dto/coachSchemas';
import fixture from '../api/__fixtures__/review.pastor.json';
import { CoachCard, CoachCardView } from '../components/CoachCard';
import { useReview } from '../hooks/useCoachJobs';
import type { JobView } from '../lib/jobController';

vi.mock('../hooks/useCoachJobs', () => ({ useReview: vi.fn() }));

const review = fixture.review as GameReviewDTO;
const waiting = { ...review, status: 'pending', analysis: null, coach: null } as GameReviewDTO;
const html = (view: JobView<GameReviewDTO>) => renderToStaticMarkup(<CoachCardView matchId="m1" view={view} onRetry={() => {}} />);

describe('CoachCard', () => {
  beforeEach(() => {
    vi.mocked(useReview).mockReset();
    vi.mocked(useReview).mockReturnValue({ view: { kind: 'pending', data: waiting }, request: async () => {}, reanalyze: async () => {} });
  });

  it('con 7 medias jugadas lo pide solo', () => {
    const h = renderToStaticMarkup(<CoachCard matchId="m1" ply={7} />);
    expect(useReview).toHaveBeenCalledWith('m1', { auto: true });
    expect(h).toContain('Tu entrenador está revisando la partida…');
  });

  it('con 4 no lo pide y dice que fue muy corta', () => {
    const h = renderToStaticMarkup(<CoachCard matchId="m1" ply={4} />);
    expect(useReview).not.toHaveBeenCalled();
    expect(h).toContain('La partida fue muy corta para analizarla.');
  });

  it('listo: precisión, primer consejo, enlace y aviso', () => {
    const h = html({ kind: 'ready', data: review });
    expect(h).toContain('66 %');
    expect(h).toContain('Tu precisión · rival 90 %');
    expect(h).toContain('aria-label="1 error grave"');
    expect(h).toContain('Protege a tu rey antes de atacar');
    expect(h).toContain('line-clamp-3');
    expect(h).toContain('href="/dashboard/partidas/m1?tab=analisis"');
    expect(h).toContain('Análisis listo: precisión 66 %.');
    expect(h).toContain('aria-busy="false"');
  });

  it.each<[JobView<GameReviewDTO>, string]>([
    [{ kind: 'loading' }, 'Tu entrenador está revisando la partida…'],
    [{ kind: 'failed', data: waiting }, 'Reintentar'],
    [{ kind: 'unavailable', code: 'GAME_TOO_SHORT', message: 'x' }, 'La partida fue muy corta para analizarla.'],
    [{ kind: 'limited', retryAfterS: 60, last: null }, 'Llegaste al límite de análisis de hoy.'],
    [{ kind: 'offline', last: null }, 'Sin conexión. Reintentando…'],
  ])('estado %#', (view, text) => {
    expect(html(view)).toContain(text);
  });

  it('esperando: aria-busy y sin aviso de listo', () => {
    const h = html({ kind: 'pending', data: waiting });
    expect(h).toContain('aria-busy="true"');
    expect(h).not.toContain('Análisis listo');
  });
});
