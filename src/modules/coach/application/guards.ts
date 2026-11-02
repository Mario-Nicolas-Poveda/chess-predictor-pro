import { ConflictError, ForbiddenError, UnprocessableError } from '@/core/shared/errors/AppError';
import { matchNotFound } from '@/modules/arena/domain/errors';
import type { Color } from '../domain/types';
import { MIN_PLIES_FOR_REVIEW } from '../infrastructure/dto/coachSchemas';
import type { CoachGame, CoachGames } from './ports/CoachGames';

/** 404 si no existe · 403 si no la jugaste. Devuelve la partida y tu color. */
export async function ownGame(games: CoachGames, matchId: string, userId: string): Promise<{ game: CoachGame; you: Color }> {
  const game = await games.find(matchId);
  if (!game) throw matchNotFound();
  if (userId !== game.whiteId && userId !== game.blackId) throw new ForbiddenError('FORBIDDEN', 'No jugaste esta partida');
  return { game, you: userId === game.whiteId ? 'white' : 'black' };
}

/** Además: 409 si no terminó · 422 si es muy corta. Las mismas reglas que coach_request_review. */
export function assertReviewable(g: CoachGame) {
  if (g.status !== 'finished') throw new ConflictError('MATCH_NOT_FINISHED', 'La partida todavía no termina');
  if (g.ply < MIN_PLIES_FOR_REVIEW)
    throw new UnprocessableError('GAME_TOO_SHORT', `Hacen falta al menos ${MIN_PLIES_FOR_REVIEW / 2} jugadas por lado para analizar`, { minPlies: MIN_PLIES_FOR_REVIEW });
}
