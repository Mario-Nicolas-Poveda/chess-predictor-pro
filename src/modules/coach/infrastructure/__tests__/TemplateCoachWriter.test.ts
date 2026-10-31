import { beforeAll, describe, expect, it } from 'vitest';
import { analyseMatch } from '../../domain/analyseMatch';
import { buildCoachInput, type CoachInput, type GameMeta, type HistoryFacts } from '../../domain/coachInput';
import { buildPlanInput, type PlanStats } from '../../domain/planInput';
import { game, sanOf } from '../../domain/__tests__/games';
import { TemplateCoachWriter } from '../TemplateCoachWriter';

const writer = new TemplateCoachWriter();
const meta: GameMeta = { result: 'loss', reason: 'checkmate', opponent: 'human', opponentElo: 1200, timeControl: '10+0', yourElo: 1150 };
const noHistory: HistoryFacts = { games: 0, accuracyAvg: null, blundersPerGame: null, topMotif: null, worstPhase: null, streak: null };

const stats: PlanStats = {
  games: 3, accuracyAvg: 66, accuracyFirstHalf: 66, accuracySecondHalf: 66, blundersPerGame: 1,
  errorsByPhase: { opening: 3, middlegame: 0, endgame: 0 }, topMotifs: [{ motif: 'allowed_mate', count: 3 }],
  openings: [], results: { wins: 1, draws: 0, losses: 2, timeouts: 0 }, yourElo: 1150,
};

let pastor: CoachInput;
beforeAll(async () => {
  const a = await analyseMatch(game(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']), { sanOf });
  pastor = buildCoachInput(a, 'black', meta, noHistory);
}, 20_000);

describe('TemplateCoachWriter.advise', () => {
  it('escribe los mismos textos del contrato con el mate del pastor', async () => {
    const r = await writer.advise(pastor);
    expect(r).toMatchObject({ source: 'template', model: null });
    expect(r.value.summary).toBe('Derrota con negras. Tu precisión fue 66 % (tu rival 90 %), y tu jugada más cara fue 3… Cf6 (error grave).');
    expect(r.value.tips).toEqual([{
      title: 'Protege a tu rey antes de atacar', category: 'tactics', plies: [6],
      body: 'Después de 3… Cf6 el rival tenía mate. Antes de jugar, revisa qué jaques puede dar tu rival.',
    }]);
    expect(r.value.drill).toBe('Antes de cada jugada, imagina la respuesta más fuerte del rival: primero sus jaques.');
  });

  it('nombra la pieza colgada y agrega el hábito de la partida', async () => {
    const a = await analyseMatch(game(['e4', 'd5', 'Qg4']), { sanOf });
    const { value } = await writer.advise(buildCoachInput(a, 'white', meta, noHistory));
    expect(value.tips[0]?.body).toContain('En 2. Dg4 tu dama quedó sin defensa');
    expect(value.tips[1]).toMatchObject({ title: 'Desarrolla antes de sacar la dama', plies: [] });
  }, 20_000);

  it('máximo 3 consejos y sin repetir motivo', async () => {
    const error = (ply: number, motivo: string) => ({ ply, jugada: `${ply}. Tb1`, tipo: 'error' as const, puntosPerdidos: 15, mejor: null, fase: 'final', motivo });
    const { value } = await writer.advise({
      ...pastor, habitos: ['se quedó sin tiempo'],
      errores: [error(10, 'permitió un mate'), error(12, 'permitió un mate'), error(14, 'tenía mate y no lo dio'), error(16, 'no capturó una pieza que se podía ganar (torre)')],
    });
    expect(value.tips.map(t => t.plies)).toEqual([[10], [14], [16]]);
  });

  it('un error sin motivo también da un consejo', async () => {
    const { value } = await writer.advise({ ...pastor, habitos: [],
      errores: [{ ply: 8, jugada: '4… a6', tipo: 'imprecisión', puntosPerdidos: 7, mejor: '4… Cf6', fase: 'apertura', motivo: null }] });
    expect(value.tips[0]).toMatchObject({ title: 'Tu jugada más cara', plies: [8] });
    expect(value.tips[0]?.body).toContain('era mejor 4… Cf6');
  });

  it('una partida sin errores', async () => {
    const { value } = await writer.advise({ ...pastor, errores: [], habitos: [], jugador: { ...pastor.jugador, resultado: 'victoria' } });
    expect(value.tips[0]?.title).toBe('Partida limpia');
    expect(value.summary).toMatch(/^Victoria con negras\..*sin errores claros\.$/);
  });
});

describe('TemplateCoachWriter.plan', () => {
  it('escribe los mismos textos del contrato', async () => {
    const r = await writer.plan(buildPlanInput(stats));
    expect(r).toMatchObject({ source: 'template', model: null });
    expect(r.value.headline).toBe('Precisión media de 66 % en 3 partidas (estable).');
    expect(r.value.focus[0]).toEqual({
      title: 'Protege a tu rey antes de atacar', category: 'tactics',
      body: 'Algunas partidas se pierden por mates que se podían ver. Antes de jugar, revisa los jaques del rival. (Pasó 3 veces en tus últimas partidas.)',
    });
    expect(r.value.drill).toBe('Antes de cada jugada, imagina la respuesta más fuerte del rival: primero sus jaques.');
  });

  it('usa el artículo correcto para la fase', async () => {
    const titleFor = async (errorsByPhase: PlanStats['errorsByPhase']) =>
      (await writer.plan(buildPlanInput({ ...stats, errorsByPhase, topMotifs: [] }))).value.focus[0];
    expect(await titleFor({ opening: 3, middlegame: 0, endgame: 0 })).toMatchObject({ title: 'Más cuidado en la apertura', category: 'opening' });
    expect(await titleFor({ opening: 0, middlegame: 3, endgame: 0 })).toMatchObject({ title: 'Más cuidado en el medio juego', category: 'strategy' });
    expect(await titleFor({ opening: 0, middlegame: 0, endgame: 3 })).toMatchObject({ title: 'Más cuidado en el final', category: 'endgame' });
  });

  it('una vez en singular y sin errores que se repitan', async () => {
    const once = await writer.plan(buildPlanInput({ ...stats, topMotifs: [{ motif: 'no_castle', count: 1 }] }));
    expect(once.value.focus[0]?.body).toContain('(Pasó 1 vez en');
    const none = await writer.plan(buildPlanInput({ ...stats, topMotifs: [], errorsByPhase: { opening: 0, middlegame: 0, endgame: 0 } }));
    expect(none.value.focus).toHaveLength(1);
    expect(none.value.focus[0]?.title).toBe('Sigue así');
  });
});
