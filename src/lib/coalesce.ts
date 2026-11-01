/**
 * Junta pedidos: nunca hay dos `run` a la vez. Si llegan pedidos mientras corre, se repite UNA vez al terminar
 * (aunque hayan llegado diez). Si `run` falla, igual se atiende el pedido pendiente.
 */
export function coalesce(run: () => Promise<void>, onError: (e: unknown) => void = () => {}) {
  let busy = false, again = false, stopped = false;
  async function trigger(): Promise<void> {
    if (stopped) return;
    if (busy) { again = true; return; }
    busy = true;
    try {
      do {
        again = false;
        try { await run(); } catch (e) { onError(e); }
      } while (again && !stopped);
    } finally {
      busy = false;
    }
  }
  return {
    trigger,
    stop() { stopped = true; again = false; },
    get busy() { return busy; },
  };
}
