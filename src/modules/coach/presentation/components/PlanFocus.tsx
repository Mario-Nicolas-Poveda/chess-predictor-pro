import { Target } from 'lucide-react';
import type { CoachSummaryDTO } from '@/modules/coach/infrastructure/dto/coachSchemas';
import { TIP_CATEGORY_UI } from '../lib/moveClass';
import { TIP_ICON } from './CoachTips';

/** "Tu plan": de 1 a 3 focos, numerados, y la rutina de la semana. */
export function PlanFocus({ plan }: { plan: NonNullable<CoachSummaryDTO['plan']> }) {
  return (
    <section aria-labelledby="plan-title" className="flex min-w-0 flex-[7_1_480px] flex-col gap-3">
      <h2 id="plan-title" className="font-mono text-[11px] font-medium uppercase tracking-[.12em] text-ink-soft">Tu plan</h2>
      {plan.focus.map((f, i) => {
        const Icon = TIP_ICON[f.category];
        return (
          <article key={f.title} className="flex gap-4 rounded-[14px] border border-rule bg-vellum p-[18px]">
            <span aria-hidden="true" className="flex-[0_0_28px] font-display text-[40px] font-semibold leading-[.9] text-ink-soft nums">{i + 1}</span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[.1em] text-ink-soft">
                <Icon size={14} aria-hidden="true" />{TIP_CATEGORY_UI[f.category].label}
              </span>
              <h3 className="font-display text-2xl font-semibold leading-tight">{f.title}</h3>
              <p className="text-[15px] leading-normal">{f.body}</p>
            </div>
          </article>
        );
      })}
      <div className="flex gap-3 rounded-[14px] bg-band p-[18px] shadow-[inset_0_0_0_1px_var(--t-rule)]">
        <Target size={22} aria-hidden="true" className="mt-0.5 flex-none" />
        <div className="flex flex-col gap-1">
          <h3 className="font-mono text-[11px] font-medium uppercase tracking-[.12em] text-ink-soft">Esta semana</h3>
          <p className="text-[15px] leading-normal">{plan.drill}</p>
        </div>
      </div>
    </section>
  );
}
