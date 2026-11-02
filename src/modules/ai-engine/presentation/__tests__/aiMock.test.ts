import { describe, expect, it } from 'vitest';
import type { ApiError } from '@/lib/apiClient';
import { createMock } from '@/modules/arena/presentation/api/arenaApi';
import { createAiMock } from '../api/aiApi';

const code = (p: Promise<unknown>) => p.then(() => 'ok', (e: ApiError) => `${e.status} ${e.code}`);

async function start() {
  const arena = createMock(), ai = createAiMock(arena);
  const { state } = await ai.create({ level: 3, prediction: true });
  return { arena, ai, id: state.id, state };
}

/** Juega y espera a que conteste el bot. */
async function round(arena: ReturnType<typeof createMock>, id: string, uci: string) {
  await arena.move(id, uci, arena.position(id).ply);
  while (arena.position(id).turn !== 'white') await new Promise(r => setTimeout(r, 20));
}

describe('mock de la IA', () => {
  it('la partida lleva el nivel elegido', async () => {
    const { state } = await start();
    expect(state.ai).toMatchObject({ level: 3, prediction: true, takebacks: 0 });
  });

  it('predicción con ETag: la misma jugada da not-modified y cada jugada tiene SAN', async () => {
    const { ai, id } = await start();
    const r = await ai.prediction(id, null);
    if (r === 'not-modified') throw new Error('primera consulta sin datos');
    expect(r.etag).toBe('"p-0"');
    expect(r.prediction.ply).toBe(0);
    expect(r.prediction.top.length).toBeGreaterThan(0);
    expect(r.prediction.top[0]!.san).toMatch(/^[a-hNBRQK]/);
    expect(await ai.prediction(id, r.etag)).toBe('not-modified');
  });

  it('en el turno de la IA la predicción no trae jugadas', async () => {
    const { arena, ai, id } = await start();
    await arena.move(id, 'e2e4', 0);
    const r = await ai.prediction(id, null);
    expect(r !== 'not-modified' && r.prediction.top).toEqual([]);
  });

  it('deshacer: 409 como la API y quita tu jugada y la de la IA', async () => {
    const { arena, ai, id } = await start();
    expect(await code(ai.takeback(id, 0))).toBe('409 NOTHING_TO_UNDO');
    await arena.move(id, 'e2e4', 0);
    expect(await code(ai.takeback(id, 1))).toBe('409 AI_THINKING');
    while (arena.position(id).turn !== 'white') await new Promise(r => setTimeout(r, 20));
    await round(arena, id, 'd2d4');
    expect(await code(ai.takeback(id, 3))).toBe('409 STALE_PLY');
    await ai.takeback(id, 4);
    expect(arena.position(id).ply).toBe(2);
    const s = await arena.state(id, 0, null);
    if (s === 'not-modified') throw new Error('sin etag no hay 304');
    expect(s.state.moves.map(m => m.ply).at(-1)).toBe(2);
    expect(s.state.ai?.takebacks).toBe(1);
  }, 10_000);
});
