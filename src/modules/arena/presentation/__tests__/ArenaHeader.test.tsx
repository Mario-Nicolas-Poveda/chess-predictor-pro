import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArenaHeader } from '../components/ArenaHeader';

vi.mock('../components/BoardModeToggle', () => ({ BoardModeToggle: () => <fieldset data-toggle /> }));

const html = renderToStaticMarkup(<ArenaHeader label="Contra la IA" pill={null} pillAccent={false} flipped={false} onFlip={() => {}}
  panelOpen onTogglePanel={() => {}} onExit={() => {}} />);

describe('cabecera de la arena', () => {
  it('las herramientas del tablero son una barra con nombre; Salir queda fuera, para subir a la primera fila', () => {
    const bar = html.slice(html.indexOf('role="toolbar"'), html.indexOf('>Salir<'));
    expect(bar).toContain('aria-label="Herramientas del tablero"');
    expect(bar).toContain('data-toggle');
    expect(bar).toMatch(/aria-label="Girar tablero"[^>]*|aria-pressed="false"/);
    expect(html).toContain('aria-expanded="true"');
  });

  it('por debajo de 360 px: marca y Salir arriba, herramientas en su propia fila a lo ancho', () => {
    expect(html).toMatch(/max-\[359px\]:order-3[^"]*max-\[359px\]:basis-full/);
    expect(html).toMatch(/max-\[359px\]:order-2 max-\[359px\]:ml-auto">Salir/);
  });
});
