/**
 * Cuando el servidor dice 403 ACCOUNT_REQUIRED (o la interfaz sabe que algo es solo para cuentas),
 * se abre UN diálogo para crear la cuenta. No se redirige a /login: el invitado no pierde lo que hacía.
 * Sin React: el cliente HTTP avisa y el diálogo escucha.
 */
export type AccountRequiredReason = { feature?: string; message: string };
type Listener = (r: AccountRequiredReason) => void;

const listeners = new Set<Listener>();
let open = false;

export function onAccountRequired(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Varios 403 a la vez (o doble clic) abren un solo diálogo. */
export function requireAccount(r: AccountRequiredReason): void {
  if (open || listeners.size === 0) return;   // sin diálogo montado (fuera del dashboard) no queda "abierto" para siempre
  open = true;
  listeners.forEach(fn => fn(r));
}

/** El diálogo lo llama al cerrarse. */
export function accountDialogClosed(): void { open = false; }

/** Textos por función (el diálogo usa el de la función que pidió la cuenta). */
export const LOCKED_TEXT: Record<string, string> = {
  playOnline: 'Crea tu cuenta para jugar en línea con ELO.',
  tournamentsJoin: 'Crea tu cuenta para inscribirte en torneos.',
  coach: 'Crea tu cuenta para usar el entrenador.',
  profileEdit: 'Crea tu cuenta para tener tu perfil y tu foto.',
  ranking: 'Crea tu cuenta y juega 5 partidas con ELO para aparecer en el ranking.',
};
export const DEFAULT_LOCKED = 'Crea tu cuenta para usar esto.';

/** Abre el diálogo con el texto de la función. */
export const askAccount = (feature?: string) =>
  requireAccount({ feature, message: (feature && LOCKED_TEXT[feature]) || DEFAULT_LOCKED });
