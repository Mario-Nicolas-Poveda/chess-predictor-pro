import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ConflictError, NotFoundError } from '../AppError';
import { toErrorResponse } from '../toErrorResponse';

const errorOf = async (res: Response) => (await res.json()).error;

describe('toErrorResponse', () => {
  it('ZodError → 400 VALIDATION_ERROR con fields', async () => {
    const res = toErrorResponse(z.object({ email: z.email() }).safeParse({ email: 'malo' }).error);
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toMatchObject({ code: 'VALIDATION_ERROR', fields: { email: [expect.any(String)] } });
  });

  it('NotFoundError → 404 con su code', async () => {
    const res = toErrorResponse(new NotFoundError('NOT_IN_QUEUE', 'No estás en la cola'));
    expect(res.status).toBe(404);
    expect(await errorOf(res)).toMatchObject({ code: 'NOT_IN_QUEUE', message: 'No estás en la cola' });
  });

  it('ConflictError con meta → 409 y meta', async () => {
    const res = toErrorResponse(new ConflictError('ACTIVE_MATCH_EXISTS', 'Ya tienes una partida en curso', undefined, { matchId: 'm1' }));
    expect(res.status).toBe(409);
    expect(await errorOf(res)).toMatchObject({ code: 'ACTIVE_MATCH_EXISTS', meta: { matchId: 'm1' } });
  });

  it('error cualquiera → 500 INTERNAL sin filtrar el mensaje', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = toErrorResponse(new Error('password=secreto'));
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(JSON.parse(text).error.code).toBe('INTERNAL');
    expect(text).not.toContain('secreto');
    log.mockRestore();
  });
});
