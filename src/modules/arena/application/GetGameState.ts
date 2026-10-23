import { ForbiddenError } from '@/core/shared/errors/AppError';
import type { PlayerDirectory } from '@/modules/matchmaking/domain/PlayerDirectory';
import type { AiPlayers } from '../domain/AiPlayers';
import type { ArenaRepository } from '../domain/ArenaRepository';
import { colorOf, turnOf, type MatchRecord } from '../domain/Match';
import { matchNotFound } from '../domain/errors';
import type { Color, GameState } from '../infrastructure/dto/arenaSchemas';
import type { BotTurn } from './BotTurn';
import { toGameState } from './toGameState';

const AI_SAFETY_MS = 1500;   // si el after() de la jugada no hizo jugar a la IA en 1,5 s, lo hace la consulta

// aplica el paso del tiempo (arena_settle) y después: 404 si no existe, 403 si userId no la juega
export async function settleOwn(repo: ArenaRepository, userId: string, id: string) {
  await repo.settle(id);
  const m = await repo.findMatch(id);
  if (!m) throw matchNotFound();
  const color = colorOf(m, userId);
  if (!color) throw new ForbiddenError('No participas en esta partida');
  return { m, color };
}

// m null = se releyó tras escribir y ya no está (borrar un jugador borra sus partidas)
export async function stateOf(repo: ArenaRepository, players: PlayerDirectory, ai: AiPlayers, m: MatchRecord | null,
  you: Color, since = 0): Promise<GameState> {
  if (!m) throw matchNotFound();
  const [moves, list, aiLevel] = await Promise.all([
    repo.listMoves(m.id, Math.min(since, Math.max(0, m.ply - 1))),   // con la última jugada, para el jaque
    players.getMany([m.whiteId, m.blackId]),
    ai.levelOf(you === 'white' ? m.blackId : m.whiteId),
  ]);
  const white = list.find(p => p.id === m.whiteId);
  const black = list.find(p => p.id === m.blackId);
  if (!white || !black) throw matchNotFound();
  return toGameState(m, moves, since, you, { white, black }, aiLevel);
}

export class GetGameState {
  constructor(private repo: ArenaRepository, private players: PlayerDirectory, private ai: AiPlayers, private bots?: BotTurn) {}

  // aiToMove: le toca a la IA hace rato. La ruta la hace jugar después de responder (también tras un 304)
  async execute(userId: string, id: string, since: number, ifNoneMatch: string | null) {
    const own = await settleOwn(this.repo, userId, id);
    // en desarrollo, si el rival es bot, contesta tablas antes de responder; entonces se relee la fila
    const m = (await this.bots?.run(own.m)) ? ((await this.repo.findMatch(id)) ?? own.m) : own.m;
    const aiToMove = await this.aiToMove(m);
    const etag = `"m-${m.version}"`;   // version sube con cada cambio de la fila (trigger)
    if (ifNoneMatch === etag) return { etag, aiToMove, notModified: true as const };
    return { etag, aiToMove, notModified: false as const,
      state: await stateOf(this.repo, this.players, this.ai, m, own.color, since) };
  }

  private async aiToMove(m: MatchRecord) {
    if (m.status !== 'pending' && m.status !== 'active') return false;
    if (Date.now() - (m.turnStartedAt ?? m.createdAt).getTime() < AI_SAFETY_MS) return false;
    return (await this.ai.levelOf(turnOf(m.ply) === 'white' ? m.whiteId : m.blackId)) !== null;
  }
}
