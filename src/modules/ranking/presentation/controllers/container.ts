import 'server-only';
import { GetRanking } from '../../application/GetRanking';
import { SupabaseRankingRepository } from '../../infrastructure/SupabaseRankingRepository';

export const getRanking = new GetRanking(new SupabaseRankingRepository());
