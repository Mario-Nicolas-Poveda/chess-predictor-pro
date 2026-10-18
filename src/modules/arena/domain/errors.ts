import { UnprocessableError } from '@/core/shared/errors/AppError';

export class IllegalMoveError extends UnprocessableError {
  constructor(uci: string) { super('ILLEGAL_MOVE', 'Esa jugada no es legal en esta posición', { uci }); }
}
