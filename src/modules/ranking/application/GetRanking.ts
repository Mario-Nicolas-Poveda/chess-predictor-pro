import { contentEtag, etagMatches } from '@/core/shared/http/etag';
import { MIN_RANKED_GAMES, type RankingPage, type RankingQuery } from '../infrastructure/dto/rankingSchemas';
import type { RankingRepository } from './ports/RankingRepository';

export type GetRankingResult =
  | { notModified: true; etag: string }
  | { notModified: false; etag: string; ranking: RankingPage };

/** GET /ranking con ETag por contenido: si nada cambió (ni tu fila), 304. */
export class GetRanking {
  constructor(private readonly repo: RankingRepository) {}

  async execute(userId: string, query: RankingQuery, ifNoneMatch: string | null): Promise<GetRankingResult> {
    const ranking = await this.repo.page(userId, query, MIN_RANKED_GAMES);
    const etag = contentEtag('rk', ranking);
    return etagMatches(ifNoneMatch, etag) ? { notModified: true, etag } : { notModified: false, etag, ranking };
  }
}
