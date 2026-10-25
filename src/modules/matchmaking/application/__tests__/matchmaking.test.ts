import { beforeEach, describe, expect, it } from 'vitest';
import { eloWindow } from '../../domain/eloWindow';
import { isPlayer, type MatchRecord } from '../../domain/Match';
import type { MatchmakingRepository } from '../../domain/MatchmakingRepository';
import type { PlayerDirectory } from '../../domain/PlayerDirectory';
import type { QueueEntry } from '../../domain/QueueEntry';
import type { AddBotInput, PlayerSummary, TimeControl } from '../../infrastructure/dto/matchmakingSchemas';
import { AbortMatch } from '../AbortMatch';
import { AddBotToQueue } from '../AddBotToQueue';
import { GetMatch } from '../GetMatch';
import { GetMatchmakingStatus } from '../GetMatchmakingStatus';
import { JoinQueue } from '../JoinQueue';
import { LeaveQueue } from '../LeaveQueue';
import { RemoveBots } from '../RemoveBots';

const match = (id: string, whiteId: string, blackId: string, status: MatchRecord['status'] = 'pending'): MatchRecord =>
  ({ id, whiteId, blackId, timeControl: '10+0', status, createdAt: new Date('2026-10-28T15:00:14Z') });

// Empareja con el primero del mismo ritmo: la ventana de ELO real vive en mm_try_pair (SQL)
class MemoryRepo implements MatchmakingRepository {
  entries: QueueEntry[] = [];
  matches: MatchRecord[] = [];
  async findEntry(userId: string) { return this.entries.find(e => e.userId === userId) ?? null; }
  async enqueue(e: Omit<QueueEntry, 'joinedAt'>) {
    const entry = { ...e, joinedAt: new Date() };
    this.entries.push(entry);
    return entry;
  }
  async dequeue(userId: string) {
    const before = this.entries.length;
    this.entries = this.entries.filter(e => e.userId !== userId);
    return this.entries.length < before;
  }
  async dequeueBots() { this.entries = this.entries.filter(e => !e.isBot); }
  async tryPair(userId: string) {
    const me = await this.findEntry(userId);
    const rival = this.entries.find(e => e.userId !== userId && e.timeControl === me?.timeControl);
    if (!me || !rival) return null;
    const m = match(`m${this.matches.length + 1}`, me.userId, rival.userId);
    this.matches.push(m);
    this.entries = this.entries.filter(e => e !== me && e !== rival);
    return m.id;
  }
  async cleanup() {}
  async countSearching() {
    const out: Record<TimeControl, number> = { '3+2': 0, '5+0': 0, '10+0': 0 };
    for (const e of this.entries) out[e.timeControl]++;
    return out;
  }
  async findOpenMatchFor(userId: string) {
    return this.matches.find(m => isPlayer(m, userId) && (m.status === 'pending' || m.status === 'active')) ?? null;
  }
  // copia, como una lectura de la BD: así el test de carrera ve el estado que había al leer
  async findMatch(id: string) { const m = this.matches.find(x => x.id === id); return m ? { ...m } : null; }
  async abortIfPending(id: string) {
    const m = this.matches.find(x => x.id === id && x.status === 'pending');
    if (m) m.status = 'aborted';
    return !!m;
  }
}

const player = (id: string, elo: number): PlayerSummary => ({ id, username: id, displayName: null, avatarUrl: null, elo });
const PLAYERS = [player('ana', 1450), player('bob', 1478), player('eva', 1300),
  player('bot_ana', 1420), player('bot_luis', 1510), player('bot_sara', 1260)];
const players: PlayerDirectory = {
  getMany: async ids => PLAYERS.filter(p => ids.includes(p.id)),
  findByUsernames: async names => PLAYERS.filter(p => names.includes(p.username)),
};

let repo: MemoryRepo;
beforeEach(() => { repo = new MemoryRepo(); });
const join = (userId: string) => new JoinQueue(repo, players).execute(userId, '10+0');
const status = (userId: string) => new GetMatchmakingStatus(repo, players).execute(userId);
const addBot = (userId: string, username?: AddBotInput['username']) =>
  new AddBotToQueue(repo, players).execute(userId, { timeControl: '10+0', username });

describe('JoinQueue', () => {
  it('entra a la cola y devuelve searching con su ELO', async () => {
    expect(await join('ana')).toMatchObject({ state: 'searching', timeControl: '10+0', waitedSeconds: 0, elo: 1450,
      eloRange: { min: 1350, max: 1550 }, searchingNow: 1, pollAfterMs: 2000 });
  });

  it('dos veces → 409 ALREADY_IN_QUEUE', async () => {
    await join('ana');
    await expect(join('ana')).rejects.toMatchObject({ code: 'ALREADY_IN_QUEUE', status: 409 });
  });

  it('con partida abierta → 409 ACTIVE_MATCH_EXISTS con meta.matchId', async () => {
    repo.matches.push(match('m1', 'ana', 'bob'));
    await expect(join('ana')).rejects.toMatchObject({ code: 'ACTIVE_MATCH_EXISTS', status: 409, meta: { matchId: 'm1' } });
  });

  it('usuario de la sesión inexistente → 401', async () => {
    await expect(join('nadie')).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
  });
});

describe('LeaveQueue', () => {
  it('sale si estaba; si no, 404 NOT_IN_QUEUE', async () => {
    await join('ana');
    await expect(new LeaveQueue(repo).execute('ana')).resolves.toBeUndefined();
    await expect(new LeaveQueue(repo).execute('ana')).rejects.toMatchObject({ code: 'NOT_IN_QUEUE', status: 404 });
  });
});

describe('GetMatchmakingStatus', () => {
  it('idle si no busca ni juega', async () => {
    expect(await status('ana')).toEqual({ state: 'idle' });
  });

  it.each([[0, 100], [10, 150], [90, 400]])('a los %i s la ventana es ±%i', async (waited, w) => {
    await join('ana');
    repo.entries = repo.entries.map(e => ({ ...e, joinedAt: new Date(Date.now() - waited * 1000) }));
    expect(await status('ana')).toMatchObject({ state: 'searching', waitedSeconds: waited,
      eloRange: { min: 1450 - w, max: 1450 + w } });
  });

  it('matched para los dos cuando tryPair encuentra rival', async () => {
    await join('ana');
    await join('bob');
    expect(await status('bob')).toMatchObject({ state: 'matched',
      match: { id: 'm1', status: 'pending', you: { id: 'bob' }, opponent: { id: 'ana' } } });
    expect(await status('ana')).toMatchObject({ state: 'matched',
      match: { id: 'm1', you: { id: 'ana' }, opponent: { id: 'bob' } } });
  });
});

describe('GetMatch', () => {
  beforeEach(() => { repo.matches.push(match('m1', 'ana', 'bob')); });
  const get = (userId: string, id = 'm1') => new GetMatch(repo, players).execute(userId, id);

  it('404 MATCH_NOT_FOUND si no existe', async () => {
    await expect(get('ana', 'm9')).rejects.toMatchObject({ code: 'MATCH_NOT_FOUND', status: 404 });
  });

  it('403 para quien no la juega', async () => {
    await expect(get('eva')).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('yourColor, you y opponent según quién pregunta', async () => {
    expect(await get('ana')).toMatchObject({ yourColor: 'white', you: { id: 'ana' }, opponent: { id: 'bob', elo: 1478 } });
    expect(await get('bob')).toMatchObject({ yourColor: 'black', you: { id: 'bob' }, opponent: { id: 'ana', elo: 1450 } });
  });
});

describe('AbortMatch', () => {
  const abort = (userId: string) => new AbortMatch(repo).execute(userId, 'm1');

  it('abandona una partida pendiente', async () => {
    repo.matches.push(match('m1', 'ana', 'bob'));
    await abort('ana');
    expect(repo.matches[0]?.status).toBe('aborted');
  });

  it.each(['active', 'finished', 'aborted'] as const)('409 MATCH_NOT_PENDING si está %s', async (s) => {
    repo.matches.push(match('m1', 'ana', 'bob', s));
    await expect(abort('ana')).rejects.toMatchObject({ code: 'MATCH_NOT_PENDING', status: 409 });
  });

  it('403 para quien no la juega', async () => {
    repo.matches.push(match('m1', 'ana', 'bob'));
    await expect(abort('eva')).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('carrera: dos abandonos a la vez → uno pasa y el otro da 409', async () => {
    repo.matches.push(match('m1', 'ana', 'bob'));
    const results = await Promise.allSettled([abort('ana'), abort('bob')]);
    expect(results.map(r => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(results.find(r => r.status === 'rejected')).toMatchObject({ reason: { code: 'MATCH_NOT_PENDING', status: 409 } });
  });
});

describe('AddBotToQueue', () => {
  it('por defecto mete al bot de ELO más cercano a quien lo pide', async () => {
    expect(await addBot('eva')).toMatchObject({ username: 'bot_sara' });   // 1300 → 1260
    expect(repo.entries).toMatchObject([{ userId: 'bot_sara', elo: 1260, isBot: true }]);
  });

  it('el mismo bot dos veces → 409 ALREADY_IN_QUEUE', async () => {
    await addBot('ana', 'bot_luis');
    await expect(addBot('ana', 'bot_luis')).rejects.toMatchObject({ code: 'ALREADY_IN_QUEUE', status: 409 });
  });

  it('con un bot en la cola, quien busca queda emparejado con él', async () => {
    await addBot('ana');
    await join('ana');
    expect(await status('ana')).toMatchObject({ state: 'matched', match: { opponent: { username: 'bot_ana' } } });
  });
});

describe('RemoveBots', () => {
  it('saca a los bots y deja a los jugadores', async () => {
    await addBot('ana');
    await join('bob');
    await new RemoveBots(repo).execute();
    expect(repo.entries.map(e => e.userId)).toEqual(['bob']);
  });
});

describe('eloWindow', () => {
  it('igual que mm_window: 0 → 100, 9 → 100, 10 → 150, 200 → 400', () => {
    expect([0, 9, 10, 200].map(s => eloWindow(s))).toEqual([100, 100, 150, 400]);
  });
});
