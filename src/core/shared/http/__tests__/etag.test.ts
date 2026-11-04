import { describe, expect, it } from 'vitest';
import { contentEtag, etagMatches, notModified } from '../etag';

describe('etagMatches', () => {
  it('compara en forma débil', () => {
    expect(etagMatches('"m-2"', '"m-2"')).toBe(true);
    expect(etagMatches('W/"m-2"', '"m-2"')).toBe(true);
    expect(etagMatches('"m-2"', 'W/"m-2"')).toBe(true);
  });
  it('no confunde otras versiones ni cabeceras vacías o mal formadas', () => {
    for (const h of ['W/"m-3"', '"m-22"', 'm-2', null, '']) expect(etagMatches(h, '"m-2"')).toBe(false);
  });
  it('listas y *', () => {
    expect(etagMatches('"a", W/"m-2" , "b"', '"m-2"')).toBe(true);
    expect(etagMatches(' * ', '"m-2"')).toBe(true);
  });
});

describe('contentEtag', () => {
  it('estable con el mismo contenido y distinto si cambia', () => {
    expect(contentEtag('rk', { a: 1 })).toBe(contentEtag('rk', { a: 1 }));
    expect(contentEtag('rk', { a: 1 })).not.toBe(contentEtag('rk', { a: 2 }));
    expect(contentEtag('rk', { a: 1 })).toMatch(/^"rk-[A-Za-z0-9_-]{16}"$/);
  });
});

describe('notModified', () => {
  it('304 sin cuerpo, con el ETag y la marca en Server-Timing', async () => {
    const res = notModified({ ETag: '"m-2"', 'Cache-Control': 'no-store' });
    expect(res.status).toBe(304);
    expect(res.headers.get('etag')).toBe('"m-2"');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('server-timing')).toContain('etag;desc="304"');
    expect(await res.text()).toBe('');
  });
});
