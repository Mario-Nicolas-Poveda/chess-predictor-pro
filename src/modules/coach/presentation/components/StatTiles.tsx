import type { SummaryStats } from '@/modules/coach/infrastructure/dto/coachSchemas';

const oneDecimal = new Intl.NumberFormat('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Tres cifras sueltas: un número solo se lee mejor como número que como gráfica. */
export function StatTiles({ stats, basedOn }: { stats: SummaryStats; basedOn: number }) {
  const tiles = [
    { n: `${stats.accuracyAvg} %`, label: 'Precisión media' },
    { n: oneDecimal.format(stats.blundersPerGame), label: 'Errores graves por partida' },
    { n: String(basedOn), label: 'Partidas analizadas' },
  ];
  return (
    <dl className="m-0 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {tiles.map(t => (
        <div key={t.label} className="flex flex-col-reverse justify-end gap-0.5 rounded-[14px] border border-rule bg-vellum p-3.5">
          <dt className="font-mono text-xs text-ink-soft">{t.label}</dt>
          <dd className="m-0 font-display text-[36px] font-semibold leading-none nums">{t.n}</dd>
        </div>
      ))}
    </dl>
  );
}
