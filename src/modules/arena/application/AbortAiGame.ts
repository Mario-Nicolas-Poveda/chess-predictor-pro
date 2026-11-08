import type { ArenaRepository } from '../domain/ArenaRepository';

/**
 * DELETE /ai/games/:id → 204: salir sin registrar mientras no hayas jugado (con negras puede haber jugado la IA).
 * 404 MATCH_NOT_FOUND · 403 FORBIDDEN / NOT_AI_MATCH · 409 MATCH_FINISHED / GAME_HAS_MOVES.
 * Las reglas viven en ai_abort_game con la fila bloqueada: aquí no se repiten.
 */
export class AbortAiGame {
  constructor(private repo: ArenaRepository) {}
  execute(userId: string, id: string) { return this.repo.abortAiGame(id, userId); }
}
