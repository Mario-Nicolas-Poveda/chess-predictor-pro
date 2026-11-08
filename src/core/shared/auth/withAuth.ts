import type { NextRequest } from 'next/server';
import { verifyToken, type Session } from './jwt';
import { readToken } from './session';
import { authorize } from './authorize';
import type { RouteAccess } from './roles';
import { toErrorResponse } from '../errors/toErrorResponse';

type Ctx<P> = { params: Promise<P> };

// import diferido: solo un token de invitado consulta la BD (y así cargar withAuth no exige el env de Supabase)
const guestAlive = (id: string) => import('./guestAlive').then(m => m.guestAlive(id));

// en Next 15+ los params de ruta llegan como Promise.
// Cerrado por defecto: solo jugadores. Una ruta que sirve a invitados lo dice con { allow: 'any' }.
export function withAuth<P = Record<string, never>>(
  handler: (req: NextRequest, session: Session, params: P) => Promise<Response>,
  opts: { allow?: RouteAccess } = {},
) {
  const allow = opts.allow ?? 'player';
  return async (req: NextRequest, ctx: Ctx<P>) => {
    const t0 = performance.now();
    let res: Response;
    try {
      const session = await authorize(await verifyToken(readToken(req)), allow, guestAlive);
      const params = ctx?.params ? await ctx.params : ({} as P);
      res = await handler(req, session, params);
    } catch (e) { res = toErrorResponse(e); }
    // solo un número: lo que tardó el servidor (DevTools → Network → Timing y scripts/latency.sh)
    try { res.headers.append('Server-Timing', `app;dur=${(performance.now() - t0).toFixed(1)}`); }
    catch { /* medir no debe romper la respuesta: un redirect tiene las cabeceras inmutables */ }
    return res;
  };
}
