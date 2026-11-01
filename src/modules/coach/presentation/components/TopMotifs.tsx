import Link from 'next/link';
import type { SummaryStats } from '@/modules/coach/infrastructure/dto/coachSchemas';
import { MOTIF_UI } from '../lib/moveClass';

/** Lo que más se repite: la barra compara, el número y el texto dicen cuánto y qué. */
export function TopMotifs({ motifs }: { motifs: SummaryStats['topMotifs'] }) {
  const top = motifs.slice(0, 5), max = Math.max(...top.map(m => m.count), 1);
  return (
    <section aria-labelledby="motifs-title" className="flex min-w-0 flex-[1_1_420px] flex-col gap-3 rounded-[14px] border border-rule bg-vellum p-4">
      <h2 id="motifs-title" className="font-mono text-[11px] font-medium uppercase tracking-[.12em] text-ink-soft">Lo que más se repite</h2>
      {!top.length && <p className="text-[15px] text-ink-soft">Todavía no se repite nada.</p>}
      <ul className="flex flex-col gap-1">
        {top.map(m => (
          <li key={m.motif} className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_96px_28px_auto]">
            <span className="text-[15px]">{MOTIF_UI[m.motif]}</span>
            <span aria-hidden="true" className="hidden h-1.5 overflow-hidden rounded-sm bg-rule sm:block"><span className="block h-full rounded-sm bg-accent" style={{ width: `${(m.count / max) * 100}%` }} /></span>
            <span className="text-right font-mono text-[13px] font-semibold nums">{m.count}</span>
            <Link href={`/dashboard/partidas/${m.lastMatchId}?tab=analisis`} aria-label={`Ver la última vez: ${MOTIF_UI[m.motif]}`}
              className="inline-flex min-h-11 items-center whitespace-nowrap font-mono text-xs font-medium underline underline-offset-4">Ver la última vez</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
