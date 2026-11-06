import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { rankPage } from '../api/rankingMock';
import { nextSort, RankingView } from '../components/RankingPage';

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

const noop = () => {};
const view = (data: ReturnType<typeof rankPage> | null, extra: Partial<Parameters<typeof RankingView>[0]> = {}) => renderToStaticMarkup(
  <RankingView sort="elo" onSort={noop} q="" onQ={noop} data={data} busy={null} problem={null} onMore={noop} onRetry={noop} {...extra} />,
);

describe('RankingView', () => {
  it('radiogroup: las flechas cambian el orden; otras teclas no', () => {
    expect(nextSort('ArrowRight', 'elo')).toBe('wins');
    expect(nextSort('ArrowLeft', 'wins')).toBe('elo');
    expect(nextSort('ArrowDown', 'elo')).toBe('wins');
    expect(nextSort('Tab', 'elo')).toBeNull();
    const html = view(rankPage({ sort: 'elo', limit: 10, offset: 0 }));
    expect(html).toMatch(/role="radio" aria-checked="true" tabindex="0"[^>]*>ELO</);
    expect(html).toMatch(/role="radio" aria-checked="false" tabindex="-1"[^>]*>Victorias</);
  });

  it('tu fila fija aparece si tu fila no está en la página', () => {
    const html = view(rankPage({ sort: 'elo', limit: 10, offset: 0 }));
    expect(html).toContain('aria-label="Tu fila en el ranking"');
    expect(html).toContain('14.º');
    expect(html).toContain('aria-label="Podio"');
    expect(html).toContain('1–10 de 30 jugadores');
    expect(html).toContain('Mostrar 10 más');
  });

  it('unranked: medidor con 4 de 5 y sin fila fija', () => {
    const html = view(rankPage({ sort: 'elo', limit: 10, offset: 0 }, false));
    expect(html).toMatch(/role="meter"[^>]*aria-valuemax="5" aria-valuenow="4" aria-valuetext="4 de 5"/);
    expect(html).toContain('Te falta 1 partida');
    expect(html).not.toContain('Tu fila en el ranking');
  });

  it('búsqueda sin resultados, sin podio ni "Mostrar más"', () => {
    const html = view(rankPage({ sort: 'elo', q: 'zzz', limit: 10, offset: 0 }), { q: 'zzz' });
    expect(html).toContain('Nadie se llama así: «zzz».');
    expect(html).not.toContain('aria-label="Podio"');
    expect(html).not.toContain('Mostrar 10 más');
  });

  it('últimas 5 con letra y aria-label; cargando = esqueleto; sin red = aviso con Reintentar', () => {
    const html = view(rankPage({ sort: 'elo', limit: 10, offset: 0 }));
    expect(html).toContain('aria-label="Últimas 5, de la más vieja a la más nueva: victoria, victoria, victoria, tablas, victoria"');
    expect(view(null)).toContain('aria-label="Cargando el ranking"');
    const off = view(rankPage({ sort: 'elo', limit: 10, offset: 0 }), { problem: 'offline' });
    expect(off).toContain('Sin conexión. Ves lo último que se cargó.');
    expect(off).toContain('Reintentar');
  });
});
