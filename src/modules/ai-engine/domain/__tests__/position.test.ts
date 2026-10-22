import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { fromFen, legal, toUci } from '../position';

const SEEDS = [
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',     // "kiwipete": enroques, clavadas, al paso
  '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
  'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',        // coronaciones
  '8/p5P1/1p2k3/2p5/8/8/PP3PPP/R5K1 w - - 0 1',                             // la del bug
];

describe('position', () => {
  it('genera exactamente las mismas jugadas legales que chess.js', { timeout: 60_000 }, () => {
    let seed = 7;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (const start of SEEDS) for (let game = 0; game < 12; game++) {
      const g = new Chess(start);
      for (let k = 0; k < 60 && !g.isGameOver(); k++) {
        const mine = legal(fromFen(g.fen())).map(toUci).sort();
        const theirs = g.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? '')).sort();
        expect(mine, g.fen()).toEqual(theirs);
        const ms = g.moves({ verbose: true });
        g.move(ms[Math.floor(rand() * ms.length)]!);
      }
    }
  });
});
