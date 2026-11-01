'use client';

import { useId, useState, type ReactNode } from 'react';

/** Marco de una gráfica: título, "Ver como tabla" y la gráfica o su tabla. */
export function ChartFigure({ title, graph, table }: { title: string; graph: ReactNode; table: ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  const id = useId();
  return (
    <figure className="m-0 flex flex-col gap-2 rounded-[14px] border border-rule bg-vellum p-4">
      <div className="flex items-baseline justify-between gap-3">
        <figcaption className="font-mono text-[11px] font-medium uppercase tracking-[.12em] text-ink-soft">{title}</figcaption>
        <button type="button" className="min-h-11 whitespace-nowrap font-mono text-xs text-ink-soft underline underline-offset-4"
          aria-pressed={asTable} aria-controls={asTable ? id : undefined} onClick={() => setAsTable(t => !t)}>
          {asTable ? 'Ver gráfica' : 'Ver como tabla'}
        </button>
      </div>
      {asTable ? <div id={id}>{table}</div> : graph}
    </figure>
  );
}
