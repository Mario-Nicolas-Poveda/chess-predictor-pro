'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { sanEs } from '@/components/chess/san';

/** Lista "n. blancas negras". Al crecer baja el scroll de la caja, nunca el de la página. */
export function MoveList({ sans, current, onPick, mark }: { sans: string[]; current: number; onPick?: (ply: number) => void; mark?: (ply: number) => ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // la jugada actual a la vista dentro de la caja (no scrollIntoView: movería la página)
    const row = el.querySelector<HTMLElement>('[data-current="true"]');
    if (!row) { el.scrollTop = el.scrollHeight; return; }
    const top = row.offsetTop, bottom = top + row.offsetHeight;
    if (top < el.scrollTop) el.scrollTop = top - 6;
    else if (bottom > el.scrollTop + el.clientHeight) el.scrollTop = bottom - el.clientHeight + 6;
  }, [sans.length, current]);

  const rows = Array.from({ length: Math.ceil(sans.length / 2) }, (_, i) => i);
  const cell = (ply: number) => {
    const san = sans[ply - 1];
    if (!san) return <span />;
    const on = ply === current;
    const cls = `rounded-lg px-2.5 py-1 text-left ${on ? 'bg-ink text-paper' : ''}`;
    return onPick
      ? <button type="button" data-current={on} onClick={() => onPick(ply)} className={`${cls} hover:bg-paper`} aria-current={on || undefined}>{sanEs(san)}{mark?.(ply)}</button>
      : <span data-current={on} className={cls}>{sanEs(san)}</span>;
  };
  return (
    <div ref={box} className="relative h-[236px] overflow-y-auto rounded-[14px] bg-band p-1.5">
      {sans.length === 0
        ? <p className="px-3.5 py-3 text-[15px] text-ink-faint">Aún no hay jugadas. Las blancas empiezan.</p>
        : (
          <ol className="flex flex-col">
            {rows.map(i => (
              <li key={i} className="grid grid-cols-[2.6rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-1.5 px-1 py-0.5 font-mono text-[15px]">
                <span className="text-[13px] text-ink-faint">{i + 1}.</span>
                {cell(i * 2 + 1)}
                {cell(i * 2 + 2)}
              </li>
            ))}
          </ol>
        )}
    </div>
  );
}
