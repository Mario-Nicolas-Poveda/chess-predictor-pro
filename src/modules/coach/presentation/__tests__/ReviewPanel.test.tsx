import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { GameReviewDTO } from '@/modules/coach/infrastructure/dto/coachSchemas';
import fixture from '../api/__fixtures__/review.pastor.json';
import { EvalGraph } from '../components/EvalGraph';
import { MoveClassMark } from '../components/MoveClassMark';
import { ReviewPanel } from '../components/ReviewPanel';
import type { JobView } from '../lib/jobController';

const review = fixture.review as GameReviewDTO;
const noop = () => {};
const html = (view: JobView<GameReviewDTO>, moment: number | null = null) => renderToStaticMarkup(
  <ReviewPanel view={view} onRequest={noop} onReanalyze={noop} ply={5} onPly={noop} moment={moment} onMoment={noop} />);

describe('ReviewPanel', () => {
  it('listo: precisión, píldoras, momento clave y pie de plantillas', () => {
    const h = html({ kind: 'ready', data: review });
    expect(h).toContain('66 %');
    expect(h).toContain('90 %');
    expect(h).toContain('aria-label="1 error grave"');
    expect(h).toContain('?? 1');
    expect(h).toContain('3… Cf6??');
    expect(h).toContain('Mejor: 3… g6');
    expect(h).toContain('Análisis · <span class="normal-case">Apertura de alfil</span>');
    expect(h).toContain('Ver 3… Cf6');
    expect(h).toContain('Consejos automáticos a partir del análisis del motor.');
    expect(h).toContain('Análisis listo.');
  });

  it('con modelo de lenguaje avisa que puede equivocarse', () => {
    const h = html({ kind: 'ready', data: { ...review, coach: { ...review.coach!, source: 'llm', model: 'x' } } });
    expect(h).toContain('Puede equivocarse.');
  });

  it('sin apertura no deja el separador', () => {
    const h = html({ kind: 'ready', data: { ...review, analysis: { ...review.analysis!, opening: null } } });
    expect(h).not.toContain('Análisis ·');
  });

  it('marca el momento activo', () => {
    expect(html({ kind: 'ready', data: review }, 6)).toContain('aria-pressed="true"');
    expect(html({ kind: 'ready', data: review })).not.toContain('aria-pressed="true"');
  });

  it('partida limpia: sin lista de momentos', () => {
    const h = html({ kind: 'ready', data: { ...review, analysis: { ...review.analysis!, keyMoments: [] } } });
    expect(h).toContain('No hubo errores claros en esta partida.');
    expect(h).not.toContain('Toca un momento');
  });

  it.each<[JobView<GameReviewDTO>, string]>([
    [{ kind: 'none' }, 'Analizar partida'],
    [{ kind: 'pending', data: { ...review, status: 'pending', analysis: null, coach: null } }, 'Suele tardar menos de 20 segundos.'],
    [{ kind: 'failed', data: { ...review, status: 'failed', analysis: null, coach: null } }, 'Reintentar'],
    [{ kind: 'unavailable', code: 'GAME_TOO_SHORT', message: 'x' }, 'hacen falta 3 jugadas por lado'],
    [{ kind: 'unavailable', code: 'FORBIDDEN', message: 'x' }, 'No puedes ver el análisis de esta partida.'],
    [{ kind: 'unavailable', code: 'MATCH_NOT_FOUND', message: 'x' }, 'No puedes ver el análisis de esta partida.'],
    [{ kind: 'limited', retryAfterS: 5400, last: null }, 'Vuelve en 2 h.'],
    [{ kind: 'offline', last: null }, 'Sin conexión. Reintentando…'],
  ])('estado %#', (view, text) => {
    expect(html(view)).toContain(text);
  });

  it('esperando: aria-busy', () => {
    expect(html({ kind: 'pending', data: review })).toContain('aria-busy="true"');
  });
});

describe('EvalGraph', () => {
  const a = review.analysis!;
  it('el slider dice la jugada, su clase y la ventaja', () => {
    const h = renderToStaticMarkup(<EvalGraph winWhite={a.winWhite} moves={a.moves} keyMoments={a.keyMoments} ply={6} onPly={noop} />);
    expect(h).toContain('role="slider"');
    expect(h).toContain('aria-valuemax="7"');
    expect(h).toContain('aria-valuetext="3… Cf6 · Error grave ??. Blancas 100 % · Negras 0 %"');
  });

  it('en la posición inicial', () => {
    const h = renderToStaticMarkup(<EvalGraph winWhite={a.winWhite} moves={a.moves} keyMoments={[]} ply={0} onPly={noop} />);
    expect(h).toContain('aria-valuetext="Posición inicial. Blancas 57 % · Negras 43 %"');
  });
});

describe('MoveClassMark', () => {
  it('error: símbolo y etiqueta', () => {
    const h = renderToStaticMarkup(<MoveClassMark cls="blunder" />);
    expect(h).toContain('??');
    expect(h).toContain('Error grave');
  });
  it('las buenas no llevan marca', () => {
    expect(renderToStaticMarkup(<MoveClassMark cls="best" />)).toBe('');
  });
});
