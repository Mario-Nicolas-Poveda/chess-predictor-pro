import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { BoardView } from '@/components/three/scenes/gameBoardScene';
import { BoardStage } from '../components/BoardStage';

const mode = vi.hoisted(() => ({ value: '3d' }));
const scene3d = vi.hoisted(() => vi.fn<(p: { view: { intro?: boolean } }) => null>(() => null));
vi.mock('../hooks/useBoardMode', () => ({ useBoardMode: () => ({ mode: mode.value }) }));
vi.mock('@/components/chess/Board2D', () => ({ Board2D: ({ children }: { children?: React.ReactNode }) => <div data-board="2d">{children}</div> }));
vi.mock('../components/GameBoard3D', () => ({ GameBoard3D: scene3d }));

const html = () => renderToStaticMarkup(<BoardStage view={{} as BoardView} onSquare={() => {}} label=""><b>encima</b></BoardStage>);

beforeEach(() => { scene3d.mockClear(); });

describe('BoardStage', () => {
  it('con 2D elegido no monta el 3D', () => {
    mode.value = '2d';
    expect(html()).toContain('data-board="2d"');
    expect(scene3d).not.toHaveBeenCalled();
  });

  it('con 3D elegido pinta primero el 2D, con el 3D montado y oculto', () => {
    mode.value = '3d';
    const out = html();
    expect(out).toContain('data-board="2d"');
    expect(scene3d).toHaveBeenCalledOnce();
    expect(out).toMatch(/pointer-events-none opacity-0[^>]*inert/);
  });

  it('el 3D llega sin la caída de piezas: el tablero ya estaba a la vista', () => {
    mode.value = '3d';
    html();
    expect(scene3d.mock.calls[0]![0].view.intro).toBe(false);
  });

  it('lo que va encima del tablero se pinta una sola vez', () => {
    mode.value = '3d';
    expect(html().match(/encima/g)).toHaveLength(1);
  });
});
