import { AI_LEVELS } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import { analyseMatch } from '../domain/analyseMatch';
import { buildCoachInput } from '../domain/coachInput';
import { factsOf, historyFacts, HISTORY_WINDOW, type GameResult } from '../domain/history';
import { initialMsOf, toPlayedMoves } from '../domain/playedMoves';
import type { Color } from '../domain/types';
import type { CoachGames } from './ports/CoachGames';
import type { CoachRepository } from './ports/CoachRepository';
import type { CoachWriter } from './ports/CoachWriter';

export const ANALYSIS_VERSION = 1;
export const REVIEW_LEASE_MS = 120_000;          // análisis (~7 s) + modelo (≤ 2 × timeout) con holgura
export const WRITE_BUDGET_MS = 35_000;           // tope para el escritor; si se pasa, usa las plantillas

export type JobResult = 'done' | 'busy' | 'failed';
export type SanOf = (fen: string, uci: string) => string;

/**
 * El trabajo: analizar con el motor (una vez por partida), juntar el historial, escribir los consejos y guardar.
 * Se puede llamar varias veces a la vez: solo una gana el permiso (coach_claim_review).
 */
export class GenerateReview {
  constructor(
    private readonly repo: CoachRepository,
    private readonly games: CoachGames,
    private readonly writer: CoachWriter,
    private readonly sanOf: SanOf,
    private readonly promptVersion: number,
    private readonly log: (msg: string, e: unknown) => void = (m, e) => console.error(m, e),
  ) {}

  async run(matchId: string, userId: string): Promise<JobResult> {
    if (!(await this.repo.claimReview(matchId, userId, REVIEW_LEASE_MS))) return 'busy';
    try {
      const g = await this.games.find(matchId);
      if (!g || g.status !== 'finished' || !g.result || !g.endedAt) throw new Error('La partida no está terminada');
      const you: Color = userId === g.whiteId ? 'white' : 'black';

      let a = await this.repo.findAnalysis(matchId);
      if (!a || a.version !== ANALYSIS_VERSION) {
        const moves = toPlayedMoves(await this.games.moves(matchId), g.timeControl === 'none');
        a = await analyseMatch(moves, {
          sanOf: this.sanOf,
          result: { winner: g.result === 'draw' ? null : g.result, reason: g.endReason ?? '' },
          initialMs: initialMsOf(g.timeControl),
        });
        await this.repo.saveAnalysis(matchId, a);
      }

      const result: GameResult = g.result === 'draw' ? 'draw' : g.result === you ? 'win' : 'loss';
      const rivalAi = you === 'white' ? g.blackAi : g.whiteAi;
      const endedAt = g.endedAt.toISOString();
      const facts = factsOf(a, you, { result, reason: g.endReason ?? '', endedAt, opponent: rivalAi ? 'ai' : 'human' });
      const previous = await this.repo.readyFacts(userId, HISTORY_WINDOW, endedAt);       // solo las de antes
      const yourElo = (you === 'white' ? g.whiteEloBefore : g.blackEloBefore) ?? (await this.games.eloOf(userId));
      const input = buildCoachInput(a, you, {
        result, reason: g.endReason ?? '', opponent: rivalAi ? 'ai' : 'human',
        aiLevelName: AI_LEVELS.find(l => l.level === rivalAi)?.name,
        opponentElo: rivalAi ? null : you === 'white' ? g.blackEloBefore : g.whiteEloBefore,
        timeControl: g.timeControl, yourElo,
      }, historyFacts(previous));

      const written = await this.writer.advise(input, AbortSignal.timeout(WRITE_BUDGET_MS));
      await this.repo.finishReview(matchId, userId, facts, written, this.promptVersion);
      return 'done';
    } catch (e) {
      this.log('[coach:review]', e);
      await this.repo.failReview(matchId, userId, e instanceof Error ? e.message : String(e)).catch(() => {});
      return 'failed';
    }
  }
}
