import 'server-only';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { verifyToken } from '@/core/shared/auth/jwt';
import { SESSION_COOKIE } from '@/core/shared/auth/session';
import { AppError } from '@/core/shared/errors/AppError';
import { afterResponse } from '@/core/shared/http/background';
import type { GameState } from '../../infrastructure/dto/arenaSchemas';
import { getGameState, playAiTurn } from '../controllers/container';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Estado inicial de la arena para el HTML del servidor (#171): el mismo caso de uso que GET /matches/:id/state,
 * con el paso del tiempo y el turno de la IA. Sin sesión → /login?next=…; no existe o no es tuya → 404 de la página.
 * Usa cookies(): la página es dinámica y no se cachea entre usuarios.
 */
export async function loadInitialGameState(matchId: string, path: string): Promise<{ state: GameState; etag: string }> {
  const session = await verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!UUID.test(matchId)) notFound();
  try {
    const r = await getGameState.execute(session.userId, matchId, 0, null);   // since 0: todas las jugadas; sin ETag no hay 304
    if (r.notModified) throw new Error('Sin If-None-Match no hay 304');
    if (r.aiToMove) afterResponse('ai-ssr', () => playAiTurn.run(matchId));   // igual que la ruta
    return { state: r.state, etag: r.etag };
  } catch (e) {
    if (e instanceof AppError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }
}
