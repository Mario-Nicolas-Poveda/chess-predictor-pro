import { Chess } from 'chess.js';

/** 'g7g8r' → { from: 'g7', to: 'g8', promotion: 'r' }. Sin letra, chess.js rechaza la coronación (no inventa dama). */
export const toMove = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });

/**
 * La ÚNICA posición con la que el cliente decide legalidad, destinos y jaque:
 * el FEN que mandó el servidor más, si hay, la jugada optimista en vuelo (con su misma letra de coronación).
 * Se crea de nuevo cada vez: nada de una instancia de chess.js que acumula jugadas aparte.
 */
export function livePosition(serverFen: string, optimisticUci: string | null): Chess {
  const g = new Chess(serverFen);
  if (optimisticUci) g.move(toMove(optimisticUci));
  return g;
}

/** Tras un 201 o un estado nuevo: ¿lo que el cliente creía coincide con lo que guardó el servidor? */
export const sameBoard = (a: string, b: string) => a.split(' ').slice(0, 4).join(' ') === b.split(' ').slice(0, 4).join(' ');
