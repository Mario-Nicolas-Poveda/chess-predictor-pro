import { describe, expect, it } from 'vitest';
import { movePieces, piecesFromFen } from '../pieces';

const at = (ps: ReturnType<typeof piecesFromFen>, sq: string) => ps.find(p => p.square === sq);

describe('movePieces', () => {
  it('el enroque corto y el largo mueven la torre', () => {
    const ps = piecesFromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const short = movePieces(ps, { from: 'e1', to: 'g1' });
    expect(at(short, 'f1')?.type).toBe('r');
    expect(at(short, 'h1')).toBeUndefined();
    const long = movePieces(ps, { from: 'e8', to: 'c8' });
    expect(at(long, 'd8')?.type).toBe('r');
    expect(at(long, 'a8')).toBeUndefined();
  });

  it('la captura al paso elimina el peón correcto', () => {
    const ps = piecesFromFen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
    const after = movePieces(ps, { from: 'e5', to: 'd6' });
    expect(at(after, 'd5')).toBeUndefined();
    expect(at(after, 'd6')?.color).toBe('w');
    expect(after).toHaveLength(3);
  });

  it('la coronación cambia el tipo y conserva el id', () => {
    const ps = piecesFromFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    const id = at(ps, 'a7')!.id;
    const after = movePieces(ps, { from: 'a7', to: 'a8', promotion: 'q' });
    expect(at(after, 'a8')).toMatchObject({ id, type: 'q' });
  });
});
