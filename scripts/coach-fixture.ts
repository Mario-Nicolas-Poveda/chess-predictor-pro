import { writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { toGameReviewDTO } from '@/modules/coach/application/coachDto';
import { analyseMatch } from '@/modules/coach/domain/analyseMatch';
import { buildCoachInput } from '@/modules/coach/domain/coachInput';
import type { PlayedMove } from '@/modules/coach/domain/types';
import { TemplateCoachWriter } from '@/modules/coach/infrastructure/TemplateCoachWriter';

/** Uso: npx tsx scripts/coach-fixture.ts src/modules/coach/presentation/api/__fixtures__/review.pastor.json */
const sanOf = (fen: string, uci: string) => new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
const g = new Chess(); const moves: PlayedMove[] = [];
for (const san of ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']) {
  const fenBefore = g.fen(); const m = g.move(san);
  moves.push({ ply: moves.length + 1, uci: m.from + m.to + (m.promotion ?? ''), san: m.san, fenBefore, msLeft: null });
}

(async () => {
  const a = await analyseMatch(moves, { sanOf, result: { winner: 'white', reason: 'checkmate' } });
  const input = buildCoachInput(a, 'black', { result: 'loss', reason: 'checkmate', opponent: 'ai', aiLevelName: 'Caballo', opponentElo: null, timeControl: 'none', yourElo: 1150 },
    { games: 2, accuracyAvg: 71, blundersPerGame: 1.5, topMotif: 'allowed_mate', worstPhase: 'opening', streak: '2 derrotas seguidas' });
  const w = await new TemplateCoachWriter().advise(input);
  const review = toGameReviewDTO({ matchId: '7f3a1c2e-0000-4000-8000-000000000007', userId: 'u', status: 'ready', version: 4, facts: null,
    coach: w.value, source: w.source, model: w.model, error: null, attempts: 1, leaseUntil: null, updatedAt: new Date('2026-11-24T15:04:05Z') }, a, 'black');
  writeFileSync(process.argv[2] ?? 'review.pastor.json', JSON.stringify({ review }, null, 1));
})();
