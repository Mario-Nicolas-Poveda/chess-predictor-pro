import { moveLabel, sanEs } from '@/modules/coach/domain/notation';
import type { ReviewMoveDTO } from '@/modules/coach/infrastructure/dto/coachSchemas';
import { moveNumberLabel } from '../lib/evalGraph';
import { MOVE_CLASS_UI } from '../lib/moveClass';

/** Tus jugadas más caras. Tocar una lleva a la posición de antes y muestra en el tablero lo que jugaste y lo mejor. */
export function KeyMoments({ moves, plies, active, onPick }: { moves: ReviewMoveDTO[]; plies: number[]; active: number | null; onPick: (ply: number) => void }) {
  const list = plies.flatMap(p => moves[p - 1] ?? []);
  return (
    <section aria-labelledby="key-moments" className="flex flex-col gap-2.5 rounded-[14px] border border-rule bg-vellum p-4">
      <h2 id="key-moments" className="font-mono text-[11px] font-medium uppercase tracking-[.12em] text-ink-soft">Momentos clave</h2>
      {!list.length && <p className="text-[15px]">No hubo errores claros en esta partida.</p>}
      {list.map(m => {
        const c = MOVE_CLASS_UI[m.class], on = active === m.ply;
        return (
          <button key={m.ply} type="button" aria-pressed={on} onClick={() => onPick(m.ply)}
            className={`flex min-h-12 items-center gap-3 rounded-[10px] px-3 py-2 text-left ${on ? 'bg-band shadow-[inset_0_0_0_1px_var(--t-ink)]' : 'shadow-[inset_0_0_0_1px_var(--t-rule)]'}`}>
            <span aria-hidden="true" className="size-2.5 flex-none rounded-full" style={{ background: c.color ?? 'var(--t-ink)' }} />
            <span className="flex min-w-0 flex-auto flex-col gap-0.5">
              <span className="font-mono text-[15px] font-semibold">{moveLabel(m)}{c.symbol}</span>
              <span className="font-mono text-xs text-ink-soft">{c.label} · −{Math.round(m.winLoss)} pts</span>
            </span>
            {m.best && <span className="whitespace-nowrap text-right font-mono text-xs text-ink-soft">Mejor: {moveNumberLabel(m.ply, sanEs(m.best.san))}</span>}
          </button>
        );
      })}
      {!!list.length && <p className="text-[13px] text-ink-soft">Toca un momento para verlo en el tablero.</p>}
    </section>
  );
}
