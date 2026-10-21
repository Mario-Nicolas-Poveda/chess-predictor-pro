import { ConflictError, NotFoundError, UnprocessableError } from '@/core/shared/errors/AppError';
import type { MatchStatus } from '../infrastructure/dto/arenaSchemas';

export class IllegalMoveError extends UnprocessableError {
  constructor(uci: string) { super('ILLEGAL_MOVE', 'Esa jugada no es legal en esta posición', { uci }); }
}

export class PromotionRequiredError extends UnprocessableError {
  constructor(uci: string) {
    super('PROMOTION_REQUIRED', 'Falta la pieza de la coronación: agrega q, r, b o n (por ejemplo e7e8q)', { uci });
  }
}

// los lanzan los casos de uso y el repositorio, al traducir los raise exception de las funciones SQL
export const matchNotFound = () => new NotFoundError('MATCH_NOT_FOUND', 'La partida no existe');
export const stalePly = (currentPly?: number) => new ConflictError('STALE_PLY',
  'La posición cambió. Vuelve a cargar la partida.', undefined, currentPly === undefined ? undefined : { currentPly });
export const matchFinished = (reason?: 'timeout') =>
  new ConflictError('MATCH_FINISHED', 'La partida ya terminó', undefined, reason && { reason });
export const matchNotActive = (status?: MatchStatus) => new ConflictError('MATCH_NOT_ACTIVE',
  status === 'pending' ? 'Aún no empezó: cancélala' : 'La partida no está en juego');
export const noDrawOffer = () => new NotFoundError('NO_DRAW_OFFER', 'No hay oferta de tablas');
export const ownDrawOffer = () => new ConflictError('OWN_DRAW_OFFER', 'No puedes aceptar tu propia oferta');
