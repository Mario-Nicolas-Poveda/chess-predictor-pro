import { ApiError } from '@/lib/apiClient';
import { ProfilePreferencesSchema, type ProfilePreferences } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type Options = {
  save: (p: ProfilePreferences, signal: AbortSignal) => Promise<ProfilePreferences>;
  onStatus: (s: SaveStatus) => void;
  onSaved: (p: ProfilePreferences) => void;
  onRejected: () => void;        // 400: el servidor no acepta esa combinación
  onUnauthorized: () => void;    // 401
  delay?: number;
};

/** Guardado optimista: debounce de 600 ms y solo vale el último (cada guardado nuevo aborta el anterior). */
export function createSaver({ save, onStatus, onSaved, onRejected, onUnauthorized, delay = 600 }: Options) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let ctrl: AbortController | null = null;
  let pending: ProfilePreferences | null = null;

  const run = async () => {
    timer = undefined;
    const p = pending;
    pending = null;
    if (!p) return;
    ctrl?.abort();
    const c = (ctrl = new AbortController());
    onStatus('saving');
    try {
      const saved = await save(p, c.signal);
      if (c !== ctrl) return;
      onSaved(saved);
      onStatus('saved');
    } catch (e) {
      if (c.signal.aborted) return;
      if (e instanceof ApiError && e.status === 401) onUnauthorized();
      else if (e instanceof ApiError && e.status === 400) { onRejected(); onStatus('idle'); }
      else { pending = p; onStatus('error'); }   // red o 500: se conserva lo local para reintentar
    }
  };

  return {
    schedule(p: ProfilePreferences) {
      // si no valida es un bug del front: no se envía
      if (!ProfilePreferencesSchema.safeParse(p).success) { console.error('[prefs] preferencias inválidas', p); return; }
      pending = p;
      clearTimeout(timer);
      timer = setTimeout(run, delay);
      onStatus('saving');
    },
    /** Envía ya lo pendiente (botón "Listo" o "Reintentar"). */
    flush() { clearTimeout(timer); return run(); },
    cancel() { clearTimeout(timer); timer = undefined; pending = null; ctrl?.abort(); },
  };
}
