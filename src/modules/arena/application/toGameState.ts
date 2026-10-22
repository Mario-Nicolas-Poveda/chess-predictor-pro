import type { PlayerSummary } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { other, turnOf, type MatchRecord, type MoveRecord } from '../domain/Match';
import { POLL_MS, type Color, type GameState, type MoveDTO } from '../infrastructure/dto/arenaSchemas';

const PENDING_MS = 3 * 60_000;   // arena_settle: las blancas tienen 3 min para la primera jugada
const REMATCH_MS = 2 * 60_000;   // arena_rematch: la oferta caduca a los 2 min

export const toMoveDTO = (x: MoveRecord): MoveDTO =>
  ({ ply: x.ply, uci: x.uci, san: x.san, whiteMs: x.whiteMs, blackMs: x.blackMs, at: x.createdAt.toISOString() });

// moves: las de ply > since y además la última, porque el jaque sale de su SAN (+ o #): el FEN no lo dice
export function toGameState(m: MatchRecord, moves: MoveRecord[], since: number, you: Color,
  players: Record<Color, PlayerSummary>, now = new Date()): GameState {
  const turn = turnOf(m.ply);
  const last = moves.at(-1);
  const rematchBy = m.rematchOfferedAt && now.getTime() - m.rematchOfferedAt.getTime() < REMATCH_MS ? m.rematchOfferBy : null;
  return {
    id: m.id, status: m.status, version: m.version, timeControl: m.timeControl, rated: m.rated, ai: null, yourColor: you,
    ply: m.ply, turn, fen: m.fen, check: last?.ply === m.ply && /[+#]$/.test(last.san),
    moves: moves.filter(x => x.ply > since).map(toMoveDTO),
    clock: { whiteMs: m.whiteMs, blackMs: m.blackMs, incrementMs: m.incrementMs, running: m.status === 'active' && m.timeControl !== 'none' ? turn : null,
      turnStartedAt: m.turnStartedAt?.toISOString() ?? null, serverNow: now.toISOString() },
    drawOffer: m.drawOfferBy,
    pendingExpiresAt: m.status === 'pending' ? new Date(m.createdAt.getTime() + PENDING_MS).toISOString() : null,
    startedAt: m.startedAt?.toISOString() ?? null,
    endedAt: m.endedAt?.toISOString() ?? null,
    // arena_finish siempre deja los ELO: el ?? 0 solo calma a TypeScript
    result: m.status === 'finished' && m.result && m.endReason ? {
      winner: m.result === 'draw' ? null : m.result, reason: m.endReason,
      elo: { white: { before: m.whiteEloBefore ?? 0, after: m.whiteEloAfter ?? 0 },
             black: { before: m.blackEloBefore ?? 0, after: m.blackEloAfter ?? 0 } } } : null,
    rematch: m.status === 'finished' ? { offeredBy: rematchBy, matchId: m.rematchId } : null,
    you: players[you], opponent: players[other(you)],
    pollAfterMs:
      m.status === 'pending' ? POLL_MS.pending :
      m.status === 'active' ? (turn === you ? POLL_MS.yourTurn : POLL_MS.theirTurn) :
      rematchBy && !m.rematchId ? POLL_MS.pending : POLL_MS.finished,   // revancha ofrecida: mismo ritmo que pending
  };
}
