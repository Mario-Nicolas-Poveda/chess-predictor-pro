import { useState, useSyncExternalStore } from 'react';
import type { GameState } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { eloDelta } from '../reasons';

export type PanelPhase = 'play' | 'end';
export type PanelChoice = { phase: PanelPhase; open: boolean } | null;

/** La última elección vale solo en su fase; al terminar se abre solo (resultado y acciones); jugando, lo guardado. */
export const panelOpenFor = (choice: PanelChoice, phase: PanelPhase, stored: boolean) =>
  choice?.phase === phase ? choice.open : phase === 'end' ? true : stored;

const KEY = 'cpp:arena-panel';
// lo guardado en este dispositivo, sin desajuste de hidratación (el servidor asume "abierto")
const readPanel = () => { try { return localStorage.getItem(KEY) !== 'closed'; } catch { return true; } };
const onStorage = (cb: () => void) => { window.addEventListener('storage', cb); return () => window.removeEventListener('storage', cb); };

/** Panel de la partida que se oculta con un botón; sin setState en efectos. */
export function useArenaPanel(status: GameState['status'] | undefined) {
  const stored = useSyncExternalStore(onStorage, readPanel, () => true);
  const phase: PanelPhase = status === 'finished' ? 'end' : 'play';
  const [choice, setChoice] = useState<PanelChoice>(null);
  const open = panelOpenFor(choice, phase, stored);
  const toggle = () => {
    if (phase === 'play') { try { localStorage.setItem(KEY, open ? 'closed' : 'open'); } catch {} }
    setChoice({ phase, open: !open });
  };
  return { open, toggle };
}

/** Qué dice y qué hace "Salir" según el estado de la partida. */
export function exitCopy(s: Pick<GameState, 'status' | 'ai' | 'you' | 'opponent'>) {
  if (s.status === 'pending') return { text: 'Aún no empieza. Si sales, la partida se cancela.', confirm: 'Salir y cancelar', action: 'cancel' as const };
  if (s.ai) return { text: 'La partida queda como derrota en tu historial. No cambia tu ELO.', confirm: 'Salir y rendirme', action: 'resign' as const };
  const n = -eloDelta(s.you.elo, s.opponent.elo, 0);
  return { text: `Contará como derrota (−${n} ELO) y ${s.opponent.username} gana la partida.`, confirm: 'Salir y rendirme', action: 'resign' as const };
}
