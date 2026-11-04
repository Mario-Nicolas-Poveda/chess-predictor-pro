import { describe, expect, it } from 'vitest';
import { RankingQuerySchema } from '../dto/rankingSchemas';

const paths = (input: unknown) => {
  const r = RankingQuerySchema.safeParse(input);
  return r.success ? [] : r.error.issues.map(i => i.path.join('.') || i.code);
};

describe('RankingQuerySchema', () => {
  it('valores por defecto; una búsqueda en blanco no cuenta', () => {
    expect(RankingQuerySchema.parse({})).toEqual({ sort: 'elo', limit: 10, offset: 0 });
    expect(RankingQuerySchema.parse({ q: '  ' }).q).toBeUndefined();
    expect(RankingQuerySchema.parse({ q: ' ana ', limit: '20', offset: '10', sort: 'wins' })).toEqual({ q: 'ana', limit: 20, offset: 10, sort: 'wins' });
  });
  it('rechaza lo que no cabe', () => {
    expect(paths({ sort: 'edad' })).toEqual(['sort']);
    expect(paths({ limit: 51 })).toEqual(['limit']);
    expect(paths({ extra: 1 })).toEqual(['unrecognized_keys']);
  });
});
