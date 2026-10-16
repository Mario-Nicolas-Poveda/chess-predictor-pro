import { NotFoundError } from '@/core/shared/errors/AppError';
import type { MatchmakingRepository } from '../domain/MatchmakingRepository';

export class LeaveQueue {
  constructor(private repo: MatchmakingRepository) {}
  async execute(userId: string) {
    if (!(await this.repo.dequeue(userId))) throw new NotFoundError('NOT_IN_QUEUE', 'No estás en la cola');
  }
}
