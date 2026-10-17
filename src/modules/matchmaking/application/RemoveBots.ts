import type { MatchmakingRepository } from '../domain/MatchmakingRepository';

export class RemoveBots {
  constructor(private repo: MatchmakingRepository) {}
  async execute() { await this.repo.dequeueBots(); }
}
