import { createHash } from 'node:crypto';

const TAGS = /(?:W\/)?"[^"]*"/g;
const opaque = (tag: string) => tag.trim().replace(/^W\//, '');

/**
 * ¿La versión del cliente es la actual? RFC 9110 §13.1.2: If-None-Match se compara en forma DÉBIL,
 * así que W/"m-2" (lo que manda el navegador cuando Vercel comprime) equivale a "m-2". Acepta listas y "*".
 */
export function etagMatches(ifNoneMatch: string | null | undefined, etag: string): boolean {
  if (!ifNoneMatch) return false;
  if (ifNoneMatch.trim() === '*') return true;
  const current = opaque(etag);
  return (ifNoneMatch.match(TAGS) ?? []).some(t => opaque(t) === current);
}

/** ETag a partir del contenido, para respuestas sin versión propia (ranking, torneos). */
export function contentEtag(prefix: string, body: unknown): string {
  return `"${prefix}-${createHash('sha1').update(JSON.stringify(body)).digest('base64url').slice(0, 16)}"`;
}

/** 304 sin cuerpo. `etag;desc="304"` en Server-Timing muestra que lo decidió la función, no Vercel. */
export function notModified(headers: Record<string, string>): Response {
  const h = new Headers(headers);
  h.append('Server-Timing', 'etag;desc="304"');
  return new Response(null, { status: 304, headers: h });
}
