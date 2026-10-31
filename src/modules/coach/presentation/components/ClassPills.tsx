import type { GameReviewDTO, MoveClass } from '@/modules/coach/infrastructure/dto/coachSchemas';
import { MOVE_CLASS_UI } from '../lib/moveClass';

const PILLS: { cls: MoveClass; many: string }[] = [
  { cls: 'inaccuracy', many: 'imprecisiones' }, { cls: 'mistake', many: 'errores' }, { cls: 'blunder', many: 'errores graves' },
];

/** Cuántos ?! ? ?? tuvo un lado: siempre con símbolo y cifra, el color nunca va solo. */
export function ClassPills({ counts }: { counts: NonNullable<GameReviewDTO['analysis']>['white']['counts'] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {PILLS.map(({ cls, many }) => {
        const c = MOVE_CLASS_UI[cls], n = counts[cls];
        return (
          <li key={cls} aria-label={`${n} ${n === 1 ? c.label.toLowerCase() : many}`}
            className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 font-mono text-xs font-medium shadow-[inset_0_0_0_1px_var(--t-rule)]">
            <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: c.color! }} />
            <span aria-hidden="true">{c.symbol} {n}</span>
          </li>
        );
      })}
    </ul>
  );
}
