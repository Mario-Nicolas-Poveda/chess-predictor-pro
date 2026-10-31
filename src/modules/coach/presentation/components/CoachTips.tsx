import { BookOpen, Clock, Compass, Flag, Smile, Target, Zap, type LucideIcon } from 'lucide-react';
import { moveLabel } from '@/modules/coach/domain/notation';
import type { GameReviewDTO, ReviewMoveDTO, TipCategory } from '@/modules/coach/infrastructure/dto/coachSchemas';
import { TIP_CATEGORY_UI } from '../lib/moveClass';

const ICON: Record<TipCategory, LucideIcon> = { opening: BookOpen, tactics: Zap, strategy: Compass, endgame: Flag, time: Clock, mindset: Smile };

/** Resumen, consejos (cada uno lleva a sus jugadas) y qué practicar. */
export function CoachTips({ coach, moves, onPick }: { coach: NonNullable<GameReviewDTO['coach']>; moves: ReviewMoveDTO[]; onPick: (ply: number) => void }) {
  return (
    <>
      <section aria-labelledby="coach-tips" className="flex flex-col gap-2.5">
        <h2 id="coach-tips" className="mt-1 font-mono text-[11px] font-medium uppercase tracking-[.12em] text-ink-soft">Consejos del entrenador</h2>
        <p className="text-[15px] leading-normal">{coach.summary}</p>
        {coach.tips.map(t => {
          const Icon = ICON[t.category];
          return (
            <article key={t.title} className="flex flex-col gap-2 rounded-[14px] border border-rule bg-vellum p-4">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[.1em] text-ink-soft">
                <Icon size={14} aria-hidden="true" />{TIP_CATEGORY_UI[t.category].label}
              </span>
              <h3 className="font-display text-[22px] font-semibold leading-tight">{t.title}</h3>
              <p className="text-[15px] leading-normal">{t.body}</p>
              {!!t.plies.length && (
                <div className="flex flex-wrap gap-2">
                  {t.plies.flatMap(p => moves[p - 1] ?? []).map(m => (
                    <button key={m.ply} type="button" onClick={() => onPick(m.ply)} className="min-h-9 rounded-full bg-band px-3 font-mono text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--t-rule)]">Ver {moveLabel(m)}</button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </section>
      <div className="flex gap-3 rounded-[14px] bg-band p-4 shadow-[inset_0_0_0_1px_var(--t-rule)]">
        <Target size={22} aria-hidden="true" className="mt-0.5 flex-none" />
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[.12em] text-ink-soft">Para practicar</span>
          <p className="text-[15px] leading-normal">{coach.drill}</p>
        </div>
      </div>
    </>
  );
}
