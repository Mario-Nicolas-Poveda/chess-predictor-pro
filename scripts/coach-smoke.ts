/**
 * Prueba el modelo del coach con una partida de ejemplo, SIN plantillas de respaldo (para ver el error real).
 * Uso (lo corre Mario; Claude Code no lee .env.local):
 *   npx tsx --env-file=.env.local scripts/coach-smoke.ts
 */
import { Chess } from 'chess.js';
import { analyseMatch } from '@/modules/coach/domain/analyseMatch';
import { buildCoachInput } from '@/modules/coach/domain/coachInput';
import type { PlayedMove } from '@/modules/coach/domain/types';
import { LlmError, OpenAiCompatibleCoachWriter } from '@/modules/coach/infrastructure/OpenAiCompatibleCoachWriter';
import { describeCoachWriter, llmConfig } from '@/modules/coach/infrastructure/coachWriterFactory';

const config = llmConfig();
if (!config) {
  console.error('Faltan COACH_LLM_BASE_URL, COACH_LLM_API_KEY o COACH_LLM_MODEL. Sin ellas el coach usa plantillas (también vale).');
  process.exit(1);
}

// Mate del pastor: las negras pierden en 4. Se analiza desde las negras.
const g = new Chess(); const moves: PlayedMove[] = [];
for (const san of ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']) {
  const fenBefore = g.fen(); const m = g.move(san);
  moves.push({ ply: moves.length + 1, uci: m.from + m.to + (m.promotion ?? ''), san: m.san, fenBefore, msLeft: null });
}
const sanOf = (fen: string, uci: string) => new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;

(async () => {
  const a = await analyseMatch(moves, { sanOf, result: { winner: 'white', reason: 'checkmate' } });
  const input = buildCoachInput(a, 'black', { result: 'loss', reason: 'checkmate', opponent: 'human', opponentElo: 1200, timeControl: '10+0', yourElo: 1150 },
    { games: 0, accuracyAvg: null, blundersPerGame: null, topMotif: null, worstPhase: null, streak: null });

  console.log('Probando', describeCoachWriter(), '…');
  const t = Date.now();
  try {
    const r = await new OpenAiCompatibleCoachWriter(config).advise(input);
    console.log(`OK en ${Date.now() - t} ms · fuente ${r.source} · modelo ${r.model}\n`);
    console.log(JSON.stringify(r.value, null, 2));
  } catch (e) {
    const status = e instanceof LlmError ? e.status : undefined;
    const hint = status === 401 || status === 403 ? 'clave inválida o sin permiso'
      : status === 404 ? 'COACH_LLM_BASE_URL o COACH_LLM_MODEL mal escritos'
      : status === 400 ? 'el proveedor rechazó un campo: prueba COACH_LLM_JSON_MODE=0, COACH_LLM_TEMPERATURE=off o quita COACH_LLM_REASONING_EFFORT'
      : status === 429 ? 'cuota agotada (espera o revisa el plan del proveedor)'
      : 'mira el mensaje';
    console.error(`FALLÓ en ${Date.now() - t} ms: ${(e as Error).message} → ${hint}`);
    process.exit(2);
  }
})();
