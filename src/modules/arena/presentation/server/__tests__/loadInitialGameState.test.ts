import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError, NotFoundError } from '@/core/shared/errors/AppError';

const h = vi.hoisted(() => ({
  token: undefined as string | undefined,
  execute: vi.fn(),
  run: vi.fn(),
  after: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => (h.token ? { value: h.token } : undefined) }) }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error(`redirect:${url}`); },
  notFound: () => { throw new Error('notFound'); },
}));
vi.mock('@/core/shared/http/background', () => ({ afterResponse: h.after }));
vi.mock('../../controllers/container', () => ({ getGameState: { execute: h.execute }, playAiTurn: { run: h.run } }));

const { signToken } = await import('@/core/shared/auth/jwt');
const { loadInitialGameState } = await import('../loadInitialGameState');
const ID = '7f3a1c2e-1b2c-4d5e-8f90-123456789abc';

beforeEach(async () => {
  vi.stubEnv('JWT_SECRET', 'secreto-de-prueba-con-mas-de-32-caracteres');
  h.token = await signToken({ userId: 'u1', username: 'ana', role: 'player' });
  h.execute.mockReset(); h.after.mockReset();
});

describe('loadInitialGameState', () => {
  it('trae el estado completo con since 0 y sin ETag; si le toca a la IA, la hace jugar después', async () => {
    h.execute.mockResolvedValue({ notModified: false, etag: '"m-3"', aiToMove: true, state: { id: ID } });
    expect(await loadInitialGameState(ID, `/dashboard/arena/${ID}`)).toEqual({ state: { id: ID }, etag: '"m-3"' });
    expect(h.execute).toHaveBeenCalledWith('u1', ID, 0, null);
    expect(h.after).toHaveBeenCalledOnce();
  });

  it('sin sesión → /login con next', async () => {
    h.token = undefined;
    await expect(loadInitialGameState(ID, '/dashboard/arena/x y')).rejects.toThrow('redirect:/login?next=%2Fdashboard%2Farena%2Fx%20y');
    expect(h.execute).not.toHaveBeenCalled();
  });

  it('id que no es UUID, partida que no existe o que no es tuya → notFound', async () => {
    await expect(loadInitialGameState('abc', '/x')).rejects.toThrow('notFound');
    h.execute.mockRejectedValueOnce(new ForbiddenError('No participas'));
    await expect(loadInitialGameState(ID, '/x')).rejects.toThrow('notFound');
    h.execute.mockRejectedValueOnce(new NotFoundError('MATCH_NOT_FOUND', 'No existe'));
    await expect(loadInitialGameState(ID, '/x')).rejects.toThrow('notFound');
  });

  it('cualquier otro error se propaga (500)', async () => {
    h.execute.mockRejectedValueOnce(new Error('BD caída'));
    await expect(loadInitialGameState(ID, '/x')).rejects.toThrow('BD caída');
  });
});
