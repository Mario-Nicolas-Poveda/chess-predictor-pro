import type { RankingPage, RankingQuery } from '../../infrastructure/dto/rankingSchemas';

export interface RankingRepository {
  /** RPC ranking_page: una sola consulta con la página, el total y tu fila. */
  page(userId: string, query: RankingQuery, minGames: number): Promise<RankingPage>;
}
