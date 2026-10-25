'use client';

import { BOARD_MODES } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';
import { useBoardMode } from '../hooks/useBoardMode';

/** 3D · 2D como radios nativos (flechas gratis). Sin WebGL, 3D deshabilitado. */
export function BoardModeToggle() {
  const { mode, no3d, setMode } = useBoardMode();
  return (
    <fieldset className="flex rounded-full bg-band p-[3px]">
      <legend className="sr-only">Tipo de tablero</legend>
      {BOARD_MODES.map(m => {
        const off = m === '3d' && no3d;
        return (
          <label key={m} title={off ? 'Tu navegador no puede mostrar 3D' : undefined} className={off ? 'cursor-not-allowed' : 'cursor-pointer'}>
            <input type="radio" name="board-mode" value={m} checked={mode === m} disabled={off} onChange={() => setMode(m)} className="peer sr-only" />
            <span className="grid h-[38px] min-w-12 place-items-center rounded-full px-3 font-mono text-[13px] uppercase transition-colors pointer-coarse:h-11 peer-checked:bg-ink peer-checked:text-paper peer-disabled:opacity-40 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">{m}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
