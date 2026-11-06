'use client';

import { PanelRightClose, PanelRightOpen, RefreshCw } from 'lucide-react';
import { BoardModeToggle } from './BoardModeToggle';

const icon = 'grid size-11 place-items-center rounded-full text-ink hover:bg-band aria-pressed:bg-band';

/** Cabecera en modo enfoque: marca sin enlace, qué partida es y las herramientas (girar, panel, salir). */
export function ArenaHeader({ label, pill, pillAccent, flipped, onFlip, panelOpen, onTogglePanel, onExit }: {
  label: string; pill: string | null; pillAccent: boolean; flipped: boolean; onFlip: () => void;
  panelOpen: boolean; onTogglePanel: () => void; onExit: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 bg-paper/82 backdrop-blur-[20px] backdrop-saturate-150">
      <div className="mx-auto flex min-h-[60px] max-w-[1320px] flex-wrap items-center gap-x-3 gap-y-1 px-5 max-[359px]:px-4 pb-1 pt-2 sm:flex-nowrap sm:py-0 lg:px-10">
        {/* texto, no enlace: en plena partida no se sale por accidente. Por debajo de 360 px: marca y Salir arriba, herramientas abajo */}
        <p className="hidden font-display text-[1.25rem] leading-none max-[359px]:order-1 max-[359px]:block sm:block sm:text-[1.45rem]">Chess Predictor <em className="text-accent">Pro</em></p>
        {/* en el celular, el estado va en su propia fila; a menos de 360 px ya lo dicen el título y la etiqueta de la partida */}
        <div className="flex min-w-0 grow basis-full items-center gap-3 max-[359px]:hidden sm:basis-0 sm:justify-center">
          <p className="flex min-w-0 items-center gap-2.5 text-caption text-ink-soft">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-ok" />
            <span className="truncate">{label}</span>
          </p>
          {pill && <span className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-medium ${pillAccent ? 'bg-accent text-on-accent' : 'bg-band text-ink'}`}>{pill}</span>}
        </div>
        <div role="toolbar" aria-label="Herramientas del tablero"
          className="ml-auto flex shrink-0 items-center gap-1.5 max-[359px]:order-3 max-[359px]:ml-0 max-[359px]:basis-full max-[359px]:justify-between">
          <div className="mr-1.5"><BoardModeToggle /></div>
          <div className="flex gap-1">
            <button type="button" className={icon} aria-pressed={flipped} aria-label="Girar tablero" title="Girar tablero" onClick={onFlip}>
              <RefreshCw size={20} aria-hidden="true" />
            </button>
            <button type="button" className={icon} aria-expanded={panelOpen} aria-controls="arena-panel"
              aria-label={panelOpen ? 'Ocultar panel' : 'Mostrar panel'} title={panelOpen ? 'Ocultar panel' : 'Mostrar panel'} onClick={onTogglePanel}>
              {panelOpen ? <PanelRightClose size={20} aria-hidden="true" /> : <PanelRightOpen size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>
        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-rule max-[359px]:hidden" />
        <button type="button" aria-haspopup="dialog" onClick={onExit}
          className="h-11 shrink-0 rounded-full px-5 font-medium shadow-[inset_0_0_0_1px_var(--t-muted)] hover:shadow-[inset_0_0_0_1px_var(--t-ink)] max-[359px]:order-2 max-[359px]:ml-auto">Salir</button>
      </div>
    </header>
  );
}
