import type { Polled } from '@/lib/etagPoller';
import { MIN_RANKED_GAMES, type GameOutcome, type RankingPage, type RankingRow } from '@/modules/ranking/infrastructure/dto/rankingSchemas';
import type { RankingParams } from './rankingApi';

/**
 * Mock de GET /ranking (NEXT_PUBLIC_API_MOCK=1): ordena, busca y pagina igual que el servidor.
 * Escenario en localStorage 'cpp:mock-ranking': ok (por defecto) · unranked · offline · slow (2 s)
 */
const scenario = () => { try { return localStorage.getItem('cpp:mock-ranking') ?? 'ok'; } catch { return 'ok'; } };

export const YOU = 'mario_p';
const OUT: Record<string, GameOutcome> = { V: 'win', T: 'draw', D: 'loss' };
// [usuario, ELO, victorias, tablas, derrotas, últimas 5 de la más vieja a la más nueva] (vista Ranking global)
const RAW: [string, number, number, number, number, string][] = [
  ['sebas_rey', 1688, 41, 6, 12, 'VVVTV'], ['caro.dama', 1641, 37, 9, 13, 'VVDVV'], ['nicole_e4', 1574, 30, 5, 15, 'VDVVT'],
  ['jp_torres', 1533, 28, 8, 16, 'DVVDV'], ['vale.alfil', 1402, 25, 4, 18, 'VVDDV'], ['dani_fianchetto', 1365, 22, 7, 19, 'DTVVD'],
  ['luisito', 1338, 26, 3, 24, 'VDDVV'], ['ana_r', 1311, 19, 6, 17, 'TVDVD'], ['bob_gambito', 1296, 21, 2, 22, 'DDVVV'],
  ['sofi.enroque', 1284, 15, 5, 12, 'VTDVD'], ['kevin_c4', 1262, 17, 4, 18, 'DVDVT'], ['laura_peon', 1240, 12, 7, 11, 'VVTDD'],
  ['tomas.torre', 1221, 14, 2, 16, 'DDVDV'], ['mario_p', 1186, 13, 3, 15, 'VDVTD'], ['jorge_mate', 1178, 11, 4, 15, 'DVDDV'],
  ['paula.jaque', 1169, 9, 6, 12, 'TVDTV'], ['andres_e5', 1158, 12, 1, 17, 'DDDVV'], ['meli_caballo', 1150, 8, 5, 11, 'VTDDV'],
  ['fabian.d4', 1143, 10, 2, 15, 'DVDVD'], ['cami_alfil', 1131, 7, 4, 12, 'TDVDD'], ['juanse_rey', 1125, 9, 1, 14, 'DDVDV'],
  ['isa.dama', 1118, 6, 6, 10, 'TTDVD'], ['mateo_g', 1112, 8, 2, 13, 'VDDDT'], ['dian.torre', 1104, 5, 3, 9, 'DVTDD'],
  ['nico_peon', 1098, 7, 1, 12, 'DDVDD'], ['luz.enroque', 1090, 4, 4, 8, 'TDDVT'], ['santi_e4', 1083, 6, 0, 11, 'DVDDD'],
  ['vero.caballo', 1077, 3, 3, 7, 'DTDVD'], ['cris_mate', 1069, 4, 1, 9, 'DDDVD'], ['pipe.jaque', 1061, 2, 2, 6, 'DTDDD'],
];

type Base = Omit<RankingRow, 'rank'>;
const BASE: Base[] = RAW.map(([username, elo, wins, draws, losses, last]) => {
  const games = wins + draws + losses;
  return {
    player: { id: `u-${username}`, username, displayName: null, avatarUrl: null, elo },
    games, wins, draws, losses, winRate: Math.round((wins / games) * 100),
    last5: [...last].reverse().map(c => OUT[c] as GameOutcome),          // la API va de la más reciente a la más vieja
  };
});

const byName = (a: Base, b: Base) => a.player.username.localeCompare(b.player.username);
const ORDER = {
  elo: (a: Base, b: Base) => b.player.elo - a.player.elo || b.wins - a.wins || b.games - a.games || byName(a, b),
  wins: (a: Base, b: Base) => b.wins - a.wins || b.player.elo - a.player.elo || b.games - a.games || byName(a, b),
};

/** Lo que respondería el servidor. `ranked = false`: tú aún no tienes 5 partidas (4) y no apareces. */
export function rankPage(p: RankingParams, ranked = true): RankingPage {
  const rows = BASE.filter(r => ranked || r.player.username !== YOU).sort(ORDER[p.sort]).map((r, i) => ({ ...r, rank: i + 1 }));
  const q = p.q?.trim() || null;
  const found = q ? rows.filter(r => r.player.username.toLowerCase().includes(q.toLowerCase())) : rows;   // el puesto no cambia al buscar
  const row = rows.find(r => r.player.username === YOU) ?? null;
  return {
    sort: p.sort, q, players: rows.length, total: found.length, offset: p.offset, limit: p.limit,
    items: found.slice(p.offset, p.offset + p.limit),
    you: { row, games: row ? row.games : MIN_RANKED_GAMES - 1, needed: MIN_RANKED_GAMES },
  };
}

const wait = (ms: number, signal?: AbortSignal) => new Promise<void>((ok, ko) => {
  const t = setTimeout(ok, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); ko(new DOMException('Aborted', 'AbortError')); }, { once: true });
});

export async function rankingMock(p: RankingParams, etag: string | null, signal?: AbortSignal): Promise<Polled<RankingPage>> {
  const s = scenario();
  await wait(s === 'slow' ? 2000 : 250, signal);
  if (s === 'offline') throw new TypeError('Failed to fetch');
  const tag = `"rk-${s}-${p.sort}-${p.q?.trim().toLowerCase() ?? ''}-${p.offset}-${p.limit}"`;
  return etag === tag ? { kind: 'not-modified' } : { kind: 'data', data: rankPage(p, s !== 'unranked'), etag: tag };
}
