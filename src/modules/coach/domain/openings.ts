/** Aperturas comunes por sus primeras jugadas (UCI). Gana el prefijo más largo. */
const OPENINGS: [string, string][] = [
  ['e2e4 e7e5 g1f3 b8c6 f1c4', 'Italiana'],
  ['e2e4 e7e5 g1f3 b8c6 f1b5', 'Española (Ruy López)'],
  ['e2e4 e7e5 g1f3 b8c6 d2d4', 'Escocesa'],
  ['e2e4 e7e5 g1f3 g8f6', 'Petrov'],
  ['e2e4 e7e5 g1f3 d7d6', 'Philidor'],
  ['e2e4 e7e5 f2f4', 'Gambito de rey'],
  ['e2e4 e7e5 d1h5', 'Ataque temprano de dama'],
  ['e2e4 e7e5 f1c4', 'Apertura de alfil'],
  ['e2e4 e7e5', 'Abierta (1.e4 e5)'],
  ['e2e4 c7c5', 'Siciliana'],
  ['e2e4 e7e6', 'Francesa'],
  ['e2e4 c7c6', 'Caro-Kann'],
  ['e2e4 d7d5', 'Escandinava'],
  ['e2e4 g8f6', 'Alekhine'],
  ['e2e4 d7d6', 'Pirc'],
  ['e2e4', 'Peón de rey (1.e4)'],
  ['d2d4 d7d5 c2c4 e7e6', 'Gambito de dama rehusado'],
  ['d2d4 d7d5 c2c4 d5c4', 'Gambito de dama aceptado'],
  ['d2d4 d7d5 c2c4 c7c6', 'Eslava'],
  ['d2d4 d7d5 c2c4', 'Gambito de dama'],
  ['d2d4 d7d5 c1f4', 'Sistema Londres'],
  ['d2d4 d7d5 g1f3 g8f6 c1f4', 'Sistema Londres'],
  ['d2d4 g8f6 c2c4 g7g6', 'India de rey'],
  ['d2d4 g8f6 c2c4 e7e6', 'India de dama o Nimzoindia'],
  ['d2d4 f7f5', 'Holandesa'],
  ['d2d4', 'Peón de dama (1.d4)'],
  ['c2c4', 'Inglesa'],
  ['g1f3', 'Réti'],
  ['f2f4', 'Bird'],
  ['b2b3', 'Larsen'],
  ['g2g4', 'Grob'],
];

export function openingName(ucis: string[]): string | null {
  const line = ucis.slice(0, 8).join(' ');
  let best: [string, string] | null = null;
  for (const o of OPENINGS) {
    if ((line === o[0] || line.startsWith(o[0] + ' ')) && (!best || o[0].length > best[0].length)) best = o;
  }
  return best ? best[1] : null;
}
