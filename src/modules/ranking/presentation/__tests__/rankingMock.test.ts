import { describe, expect, it } from 'vitest';
import { rankPage, YOU } from '../api/rankingMock';

const base = { sort: 'elo' as const, limit: 10, offset: 0 };

describe('mock del ranking (mismas reglas que el servidor)', () => {
  it('por ELO: 30 jugadores, mario_p en el 14.º y last5 de la más reciente a la más vieja', () => {
    const p = rankPage(base);
    expect(p.players).toBe(30);
    expect(p.items.map(r => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(p.items[0]?.player.username).toBe('sebas_rey');
    expect(p.you.row?.rank).toBe(14);
    expect(p.you.row?.last5).toEqual(['loss', 'draw', 'win', 'loss', 'win']);   // 'VDVTD' al revés
  });

  it('buscar "AL" no cambia el puesto', () => {
    const all = rankPage({ ...base, limit: 50 }).items;
    const found = rankPage({ ...base, q: 'AL' });
    expect(found.total).toBe(found.items.length);
    expect(found.items.length).toBeGreaterThan(0);
    for (const r of found.items) {
      expect(r.player.username.toLowerCase()).toContain('al');
      expect(r.rank).toBe(all.find(a => a.player.id === r.player.id)?.rank);
    }
    expect(found.players).toBe(30);
  });

  it('por victorias: primero quien más gana; empate → ELO', () => {
    const items = rankPage({ ...base, sort: 'wins', limit: 50 }).items;
    for (let i = 1; i < items.length; i++) {
      const [a, b] = [items[i - 1]!, items[i]!];
      expect(a.wins > b.wins || (a.wins === b.wins && a.player.elo >= b.player.elo)).toBe(true);
    }
    expect(items[0]?.rank).toBe(1);
  });

  it('"Mostrar más": el offset siguiente trae los puestos 11–20', () => {
    expect(rankPage({ ...base, offset: 10 }).items.map(r => r.rank)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('unranked: no apareces y llevas 4 de 5', () => {
    const p = rankPage(base, false);
    expect(p.you).toEqual({ row: null, games: 4, needed: 5 });
    expect(p.players).toBe(29);
    expect(p.items.some(r => r.player.username === YOU)).toBe(false);
  });
});
