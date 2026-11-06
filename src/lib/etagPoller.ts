/** Lo que devuelve una consulta con ETag: datos nuevos o 304. */
export type Polled<T> = { kind: 'data'; data: T; etag: string | null } | { kind: 'not-modified' };
