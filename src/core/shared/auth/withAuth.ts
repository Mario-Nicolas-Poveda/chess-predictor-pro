import type { NextRequest } from 'next/server';
import { verifyToken, type Session } from './jwt';
import { readToken } from './session';
import { UnauthorizedError } from '../errors/AppError';
import { toErrorResponse } from '../errors/toErrorResponse';

type Ctx<P> = { params: Promise<P> };

// en Next 15+ los params de ruta llegan como Promise
export function withAuth<P = Record<string, never>>(
  handler: (req: NextRequest, session: Session, params: P) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    const t0 = performance.now();
    let res: Response;
    try {
      const session = await verifyToken(readToken(req));
      if (!session) throw new UnauthorizedError();
      const params = ctx?.params ? await ctx.params : ({} as P);
      res = await handler(req, session, params);
    } catch (e) { res = toErrorResponse(e); }
    // solo un número: lo que tardó el servidor (DevTools → Network → Timing y scripts/latency.sh)
    try { res.headers.set('Server-Timing', `app;dur=${(performance.now() - t0).toFixed(1)}`); }
    catch { /* medir no debe romper la respuesta: un redirect tiene las cabeceras inmutables */ }
    return res;
  };
}
