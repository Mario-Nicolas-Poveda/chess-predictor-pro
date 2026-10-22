import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ConflictError, ForbiddenError, NotFoundError, PayloadTooLargeError, TooManyRequestsError } from '../AppError';
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

  it('TooManyRequestsError → 429 RATE_LIMITED con Retry-After y meta.retryAfterS', async () => {
    const res = toErrorResponse(new TooManyRequestsError(42));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
    expect(await errorOf(res)).toMatchObject({ code: 'RATE_LIMITED', meta: { retryAfterS: 42 } });
  });

  it('PayloadTooLargeError → 413 con su code', async () => {
    const res = toErrorResponse(new PayloadTooLargeError('FILE_TOO_LARGE', 'La foto pesa más de 1 MB'));
    expect(res.status).toBe(413);
    expect(await errorOf(res)).toMatchObject({ code: 'FILE_TOO_LARGE' });
  });

  it('ForbiddenError: con un argumento es el mensaje; con dos, código y mensaje', () => {
    expect(new ForbiddenError('No participas')).toMatchObject({ code: 'FORBIDDEN', message: 'No participas', status: 403 });
    expect(new ForbiddenError('NOT_AI_MATCH', 'Solo contra la IA')).toMatchObject({ code: 'NOT_AI_MATCH', message: 'Solo contra la IA' });
    expect(new ForbiddenError()).toMatchObject({ code: 'FORBIDDEN', message: 'No tienes permiso para esto' });
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
