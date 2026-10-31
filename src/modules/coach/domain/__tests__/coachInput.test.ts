import { beforeAll, describe, expect, it } from 'vitest';
import { analyseMatch } from '../analyseMatch';
import { buildCoachInput, type GameMeta, type HistoryFacts } from '../coachInput';
import { moveLabel, sanEs } from '../notation';
import type { MatchAnalysis } from '../types';
import { game, sanOf } from './games';

const meta: GameMeta = { result: 'loss', reason: 'checkmate', opponent: 'human', opponentElo: 1200, timeControl: '10+0', yourElo: 1150 };
const noHistory: HistoryFacts = { games: 0, accuracyAvg: null, blundersPerGame: null, topMotif: null, worstPhase: null, streak: null };

let a: MatchAnalysis;
beforeAll(async () => {
  a = await analyseMatch(game(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']), { sanOf });
}, 20_000);

describe('notation', () => {
  it('sanEs traduce las piezas', () => {
    expect(sanEs('Nxf7+')).toBe('Cxf7+');
    expect(sanEs('bxc8=Q+')).toBe('bxc8=D+');
    expect(sanEs('O-O-O')).toBe('O-O-O');
  });

  it('moveLabel numera blancas y negras', () => {
    expect(moveLabel({ ply: 27, san: 'd4' })).toBe('14. d4');
    expect(moveLabel({ ply: 28, san: 'Nxe5' })).toBe('14… Cxe5');
  });
});

describe('buildCoachInput', () => {
  it('trae tus errores con la mejor jugada y el motivo', () => {
    const input = buildCoachInput(a, 'black', meta, noHistory);
    expect(input.jugador).toMatchObject({ color: 'negras', resultado: 'derrota', rival: 'persona con ELO 1200', ritmo: '10+0' });
    expect(input.errores[0]).toMatchObject({ ply: 6, jugada: '3… Cf6', tipo: 'error grave', mejor: '3… g6', fase: 'apertura', motivo: 'permitió un mate' });
    expect(input.momentosClave).toEqual([6]);
    expect(input.historial).toBeNull();
  });

  it('la pieza colgada va en el motivo y los hábitos aparte', async () => {
    const dama = await analyseMatch(game(['e4', 'd5', 'Qg4']), { sanOf });
    const input = buildCoachInput(dama, 'white', { ...meta, result: 'win', opponent: 'ai', aiLevelName: 'Alfil', timeControl: 'none' }, noHistory);
    expect(input.errores[0]?.motivo).toBe('dejó una pieza sin defensa (dama)');
    expect(input.jugador).toMatchObject({ rival: 'IA nivel Alfil', ritmo: 'sin reloj' });
    expect(input.habitos).toEqual(['sacó la dama muy pronto']);
  }, 20_000);

  it('con historial lo resume en español', () => {
    const history: HistoryFacts = { games: 2, accuracyAvg: 71, blundersPerGame: 1.5, topMotif: 'allowed_mate', worstPhase: 'opening', streak: '2 derrotas seguidas' };
    expect(buildCoachInput(a, 'black', meta, history).historial).toEqual({
      partidasAnalizadas: 2, precisionMedia: 71, erroresGravesPorPartida: 1.5,
      motivoMasFrecuente: 'permitió un mate', faseConMasErrores: 'apertura', racha: '2 derrotas seguidas',
    });
  });

  it('no lleva ids, nombres ni correos', () => {
    const json = JSON.stringify(buildCoachInput(a, 'black', meta, { ...noHistory, games: 1, accuracyAvg: 70 }));
    expect(json).not.toMatch(/@|[0-9a-f]{8}-[0-9a-f]{4}|username|email|displayName|userId|matchId/i);
  });
});
