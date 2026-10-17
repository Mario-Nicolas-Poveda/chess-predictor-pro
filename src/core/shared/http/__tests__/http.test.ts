import { describe, expect, it } from 'vitest';
import { ZodError, z } from 'zod';
import { readJson } from '../readJson';
import { created, noContent } from '../responses';

const Schema = z.object({ timeControl: z.enum(['3+2', '5+0', '10+0']) }).strict();
const post = (body: string, type?: string) =>
  new Request('http://localhost/api/v1/x', { method: 'POST', body, headers: type ? { 'content-type': type } : {} });

describe('readJson', () => {
  it('sin content-type JSON → 415 (aunque el cuerpo sea JSON)', async () => {
    await expect(readJson(post('{"timeControl":"10+0"}'), Schema))
      .rejects.toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE', status: 415 });
  });

  it('JSON roto → 400 INVALID_JSON', async () => {
    await expect(readJson(post('{malo', 'application/json'), Schema))
      .rejects.toMatchObject({ code: 'INVALID_JSON', status: 400 });
  });

  it('JSON válido que no cumple el schema → ZodError', async () => {
    await expect(readJson(post('{"timeControl":"1+0"}', 'application/json'), Schema)).rejects.toBeInstanceOf(ZodError);
  });

  it('acepta charset en el content-type y devuelve los datos', async () => {
    await expect(readJson(post('{"timeControl":"10+0"}', 'application/json; charset=utf-8'), Schema))
      .resolves.toEqual({ timeControl: '10+0' });
  });
});

describe('responses', () => {
  it('noContent → 204 sin cuerpo', async () => {
    const res = noContent();
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
  });

  it('created → 201 con Location', async () => {
    const res = created({ id: 'm1' }, '/api/v1/matchmaking/status');
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe('/api/v1/matchmaking/status');
    expect(await res.json()).toEqual({ id: 'm1' });
  });
});
