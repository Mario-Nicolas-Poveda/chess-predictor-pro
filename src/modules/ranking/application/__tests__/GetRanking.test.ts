import { describe, expect, it } from 'vitest';
import type { RankingPage } from '../../infrastructure/dto/rankingSchemas';
import { RankingQuerySchema } from '../../infrastructure/dto/rankingSchemas';
import { GetRanking } from '../GetRanking';
import type { RankingRepository } from '../ports/RankingRepository';

const query = RankingQuerySchema.parse({});
const page = (games: number): RankingPage => ({
  sort: 'elo', q: null, players: 0, total: 0, offset: 0, limit: 10, items: [], you: { row: null, games, needed: 5 },
});

describe('GetRanking', () => {
  it('200 y luego 304 con la forma débil; si cambia tu fila, cambia el ETag', async () => {
    let games = 2;
    const repo: RankingRepository = { page: async () => page(games) };
    const uc = new GetRanking(repo);
    const first = await uc.execute('u1', query, null);
    expect(first.notModified).toBe(false);
    expect(await uc.execute('u1', query, `W/${first.etag}`)).toEqual({ notModified: true, etag: first.etag });
    games = 3;
    const third = await uc.execute('u1', query, `W/${first.etag}`);
    expect(third.notModified).toBe(false);
    expect(third.etag).not.toBe(first.etag);
  });
});
