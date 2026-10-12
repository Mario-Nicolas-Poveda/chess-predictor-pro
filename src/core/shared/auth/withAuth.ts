import type { NextRequest } from 'next/server';
import { verifyToken, type Session } from './jwt';
import { readToken } from './session';
import { AppError } from '../errors/AppError';
import { toErrorResponse } from '../errors/toErrorResponse';

export function withAuth(handler: (req: NextRequest, s: Session) => Promise<Response>) {
  return async (req: NextRequest) => {
    try {
      const s = await verifyToken(readToken(req));
      if (!s) throw new AppError('UNAUTHORIZED', 'Sesión inválida o expirada', 401);
      return await handler(req, s);
    } catch (e) { return toErrorResponse(e); }
  };
}
