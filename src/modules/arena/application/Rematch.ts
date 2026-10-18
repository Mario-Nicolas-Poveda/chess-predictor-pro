import { NotFoundError } from '@/core/shared/errors/AppError';
import type { ArenaRepository } from '../domain/ArenaRepository';
import { other } from '../domain/Match';
import { settleOwn } from './GetGameState';

export class Rematch {
  constructor(private repo: ArenaRepository) {}

  // ofrecer y aceptar son la misma llamada (arena_rematch decide con la fila bloqueada)
  async request(userId: string, id: string) {
    const { m, color } = await settleOwn(this.repo, userId, id);
    let matchId = await this.repo.rematch(id, color);
    const rival = color === 'white' ? m.blackId : m.whiteId;
    // contra un bot (solo en desarrollo) la revancha se acepta sola
    if (!matchId && (await this.repo.botIds([rival])).length) matchId = await this.repo.rematch(id, other(color));
    return matchId ? { state: 'accepted' as const, matchId } : { state: 'offered' as const };
  }

  // retira la propia o rechaza la del rival
  async cancel(userId: string, id: string) {
    await settleOwn(this.repo, userId, id);
    if (!(await this.repo.cancelRematch(id))) throw new NotFoundError('NO_REMATCH_OFFER', 'No hay oferta de revancha');
  }
}
