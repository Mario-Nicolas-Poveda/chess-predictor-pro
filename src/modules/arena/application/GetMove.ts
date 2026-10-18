import { NotFoundError } from '@/core/shared/errors/AppError';
import type { ArenaRepository } from '../domain/ArenaRepository';
import { settleOwn } from './GetGameState';
import { toMoveDTO } from './toGameState';

export class GetMove {
  constructor(private repo: ArenaRepository) {}

  async execute(userId: string, id: string, ply: number) {
    await settleOwn(this.repo, userId, id);
    const move = await this.repo.findMove(id, ply);
    if (!move) throw new NotFoundError('MOVE_NOT_FOUND', 'Esa jugada no existe');
    return toMoveDTO(move);
  }
}
