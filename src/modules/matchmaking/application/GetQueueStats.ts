import type { MatchmakingRepository } from '../domain/MatchmakingRepository';
import type { QueueStats } from '../infrastructure/dto/matchmakingSchemas';

export class GetQueueStats {
  constructor(private repo: MatchmakingRepository) {}
  async execute(): Promise<QueueStats> {
    const searching = await this.repo.countSearching();
    return { searching, total: Object.values(searching).reduce((a, b) => a + b, 0) };
  }
}
