import { after } from 'next/server';

/** Trabajo después de responder (en Vercel sigue vivo con waitUntil). Los errores se registran y nunca llegan al usuario. */
export function afterResponse(label: string, fn: () => Promise<unknown>) {
  after(async () => {
    try { await fn(); } catch (e) { console.error(`[after:${label}]`, e); }
  });
}
