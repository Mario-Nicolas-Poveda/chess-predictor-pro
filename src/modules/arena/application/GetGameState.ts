import { ForbiddenError } from '@/core/shared/errors/AppError';
import type { PlayerDirectory } from '@/modules/matchmaking/domain/PlayerDirectory';
import type { ArenaRepository } from '../domain/ArenaRepository';
import { colorOf, type MatchRecord } from '../domain/Match';
import { matchNotFound } from '../domain/errors';
import type { Color, GameState } from '../infrastructure/dto/arenaSchemas';
import type { BotTurn } from './BotTurn';
import { toGameState } from './toGameState';

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
export async function stateOf(repo: ArenaRepository, players: PlayerDirectory, m: MatchRecord | null, you: Color,
  since = 0): Promise<GameState> {
  if (!m) throw matchNotFound();
  const [moves, list] = await Promise.all([
    repo.listMoves(m.id, Math.min(since, Math.max(0, m.ply - 1))),   // con la última jugada, para el jaque
    players.getMany([m.whiteId, m.blackId]),
  ]);
  const white = list.find(p => p.id === m.whiteId);
  const black = list.find(p => p.id === m.blackId);
  if (!white || !black) throw matchNotFound();
  return toGameState(m, moves, since, you, { white, black });
}

export class GetGameState {
  constructor(private repo: ArenaRepository, private players: PlayerDirectory, private bots?: BotTurn) {}

  async execute(userId: string, id: string, since: number, ifNoneMatch: string | null) {
    const own = await settleOwn(this.repo, userId, id);
    // en desarrollo, si el rival es bot, juega o contesta tablas antes de responder; entonces se relee la fila
    const m = (await this.bots?.run(own.m)) ? ((await this.repo.findMatch(id)) ?? own.m) : own.m;
    const etag = `"m-${m.version}"`;   // version sube con cada cambio de la fila (trigger)
    if (ifNoneMatch === etag) return { etag, notModified: true as const };
    return { etag, notModified: false as const, state: await stateOf(this.repo, this.players, m, own.color, since) };
  }
}
