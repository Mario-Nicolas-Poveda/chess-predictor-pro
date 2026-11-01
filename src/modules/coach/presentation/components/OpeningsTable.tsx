import type { SummaryStats } from '@/modules/coach/infrastructure/dto/coachSchemas';

const COLOR = { white: 'blancas', black: 'negras' } as const;
const TH = 'px-2 py-1.5 font-mono text-xs font-medium';

/** Tus aperturas, de la más jugada a la menos. Una tabla: son datos para consultar, no una tendencia. */
export function OpeningsTable({ openings }: { openings: SummaryStats['openings'] }) {
  const rows = [...openings].sort((a, b) => b.games - a.games);
  return (
    <section aria-labelledby="open-title" className="flex min-w-0 flex-[1_1_420px] flex-col gap-3 rounded-[14px] border border-rule bg-vellum p-4">
      <h2 id="open-title" className="font-mono text-[11px] font-medium uppercase tracking-[.12em] text-ink-soft">Tus aperturas</h2>
      {rows.length ? (
        <div tabIndex={0} role="region" aria-labelledby="open-title" className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <caption className="sr-only">Resultados por apertura en tus últimas partidas analizadas</caption>
            <thead>
              <tr className="text-left text-ink-soft">
                <th scope="col" className={TH}>Apertura</th><th scope="col" className={TH}>Con</th>
                <th scope="col" className={`${TH} text-right`}>Partidas</th><th scope="col" className={`${TH} text-right`}>V–T–D</th><th scope="col" className={`${TH} text-right`}>% victorias</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(o => (
                <tr key={`${o.name}-${o.color}`} className="border-t border-rule">
                  <td className="p-2">{o.name}</td><td className="p-2">{COLOR[o.color]}</td>
                  <td className="p-2 text-right font-mono nums">{o.games}</td>
                  <td className="p-2 text-right font-mono nums">{o.wins}–{o.draws}–{o.losses}</td>
                  <td className="p-2 text-right font-mono nums">{Math.round((o.wins / o.games) * 100)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-[15px] text-ink-soft">Tus partidas analizadas no tienen una apertura conocida.</p>}
    </section>
  );
}
