'use client';

import { useEffect, useState } from 'react';
import type { GameState } from '@/modules/arena/infrastructure/dto/arenaSchemas';

/**
 * Milisegundos restantes de cada lado, corrigiendo la diferencia entre tu reloj y el del servidor (`offset`, medido al recibir el estado).
 * `paused`: con una jugada en vuelo los relojes se quedan quietos. `tick`: sigue contando sin reloj corriendo (cuenta atrás de pending).
 */
export function useClock(clock: GameState['clock'] | undefined, offset: number, onFlag: () => void, { paused = false, tick = false } = {}) {
  const [now, setNow] = useState(() => Date.now());
  const running = !!clock?.running || tick;
  useEffect(() => {
    if (!running || paused) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [running, paused, clock?.turnStartedAt]);

  const serverNow = now + offset;
  const spent = clock?.running && clock.turnStartedAt ? Math.max(0, serverNow - Date.parse(clock.turnStartedAt)) : 0;
  const white = clock ? Math.max(0, clock.whiteMs - (clock.running === 'white' ? spent : 0)) : 0;
  const black = clock ? Math.max(0, clock.blackMs - (clock.running === 'black' ? spent : 0)) : 0;
  // al llegar a 0 se pide el estado ya: el servidor cierra la partida por tiempo
  const flagged = (clock?.running === 'white' && white === 0) || (clock?.running === 'black' && black === 0);
  useEffect(() => { if (flagged) onFlag(); }, [flagged, onFlag]);
  return { white, black, serverNow };
}
