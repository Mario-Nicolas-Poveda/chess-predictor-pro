/** Reglas puras de la llave. Las mismas que las funciones SQL de 0009 (que son las que deciden). */

export type BracketSize = 4 | 8;

/** 4 inscritos → llave de 4; de 5 a 8 → llave de 8 (los mejores pasan directo). */
export const bracketSizeFor = (players: number): BracketSize => (players <= 4 ? 4 : 8);

export const roundsFor = (size: BracketSize): 2 | 3 => (size === 4 ? 2 : 3);

/** Siembras de la primera ronda, de arriba abajo, en parejas: 1-8, 4-5, 2-7, 3-6 (o 1-4, 2-3). */
export const seedOrder = (size: BracketSize): number[] => (size === 4 ? [1, 4, 2, 3] : [1, 8, 4, 5, 2, 7, 3, 6]);

export function roundName(round: number, rounds: number): string {
  const fromEnd = rounds - round;
  return fromEnd === 0 ? 'Final' : fromEnd === 1 ? 'Semifinal' : 'Cuartos';
}

/** Cuántas partidas tiene una ronda. */
export const gamesIn = (size: BracketSize, round: number) => size / 2 ** round;

/** Las dos partidas de la ronda anterior que alimentan (round, slot). */
export const feeders = (slot: number): [number, number] => [2 * slot - 1, 2 * slot];

/** Plazo para la primera jugada de las blancas. */
export const deadlineOf = (createdAt: string, noshowS: number) =>
  new Date(new Date(createdAt).getTime() + noshowS * 1000).toISOString();
