import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Section';
import type { GameReviewDTO } from '@/modules/coach/infrastructure/dto/coachSchemas';
import type { JobView } from '../lib/jobController';

const BOX = 'flex flex-col items-start gap-3 rounded-[14px] border border-rule bg-vellum p-[18px]';

/** Los 3 bloques mientras carga: del alto de lo que viene, sin saltos. */
export function ReviewSkeleton() {
  return <div aria-hidden="true" className="flex flex-col gap-3"><Skeleton className="h-[280px]" /><Skeleton className="h-[200px]" /><Skeleton className="h-[160px]" /></div>;
}

const message = (code: string, fallback: string) =>
  code === 'GAME_TOO_SHORT' ? 'La partida fue muy corta para analizarla (hacen falta 3 jugadas por lado).'
  : code === 'FORBIDDEN' || code === 'MATCH_NOT_FOUND' ? 'No puedes ver el análisis de esta partida.' : fallback;

/** Todo lo que no es el análisis listo. */
export function ReviewState({ view, onRequest }: { view: Exclude<JobView<GameReviewDTO>, { kind: 'ready' }>; onRequest: () => void }) {
  switch (view.kind) {
    case 'loading': return <ReviewSkeleton />;
    case 'none': return (
      <div className={BOX}>
        <p className="text-lg font-semibold">Esta partida todavía no tiene análisis.</p>
        <p className="text-[15px] text-ink-soft">El entrenador revisa cada jugada con el motor y te deja de 1 a 3 consejos.</p>
        <Button onClick={onRequest}>Analizar partida</Button>
      </div>
    );
    case 'pending': return (
      <div className={`${BOX} items-stretch`}>
        <p className="text-lg font-semibold">Analizando tu partida…</p>
        <div className="relative h-1 overflow-hidden rounded-sm bg-rule"><span className="animate-slide absolute inset-y-0 left-0 w-2/5 rounded-sm bg-accent" /></div>
        <p className="text-sm text-ink-soft">Suele tardar menos de 20 segundos.</p>
      </div>
    );
    case 'failed': return (
      <div className={BOX}>
        <p className="text-lg font-semibold">No se pudo analizar la partida.</p>
        <Button variant="ghost" onClick={onRequest}>Reintentar</Button>
      </div>
    );
    case 'unavailable': return <div className={BOX}><p className="text-[15px]">{message(view.code, view.message)}</p></div>;
    case 'limited': return <div className={BOX}><p className="text-[15px]">Llegaste al límite de análisis de hoy. Vuelve en {Math.ceil(view.retryAfterS / 3600)} h.</p></div>;
    case 'offline': return <div className={BOX}><p className="text-[15px]">Sin conexión. Reintentando…</p></div>;
  }
}
