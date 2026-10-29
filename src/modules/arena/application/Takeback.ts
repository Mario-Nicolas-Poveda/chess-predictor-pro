import type { ArenaRepository } from '../domain/ArenaRepository';
import { stalePly } from '../domain/errors';
import { settleOwn } from './GetGameState';

export class Takeback {
  constructor(private repo: ArenaRepository) {}

  // quita tu última jugada y la respuesta de la IA. arena_takeback vuelve a comprobar todo con la fila bloqueada
  async execute(userId: string, id: string, ply: number) {
    const { m, color } = await settleOwn(this.repo, userId, id);
    if (!m.rated && ply !== m.ply) throw stalePly(m.ply);   // aquí con meta.currentPly
    await this.repo.takeback(id, color, ply);              // NOT_AI_MATCH · AI_THINKING · NOTHING_TO_UNDO · MATCH_FINISHED
  }
}
