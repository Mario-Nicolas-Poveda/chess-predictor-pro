/** Espera hasta la próxima consulta: con el canal en vivo basta un respaldo cada 10 s; 0 = no consultar más. */
export const pollWait = (pollAfterMs: number, live: boolean) => (pollAfterMs > 0 && live ? Math.max(pollAfterMs, 10_000) : pollAfterMs);
