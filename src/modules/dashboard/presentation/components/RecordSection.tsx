import type { ProfileStats } from '@/modules/dashboard/infrastructure/dto/profileSchemas';

export function RecordSection({ stats: { gamesPlayed, wins, losses, winRate } }: { stats: ProfileStats }) {
  return (
    <section className="grid gap-10 border-t border-rule pt-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-0">
      <div className="lg:pr-12">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">{gamesPlayed} partidas</p>
          <p className="text-sm text-ink-soft"><b className="font-semibold text-ink">{gamesPlayed ? `${winRate} %` : '—'}</b> de victorias</p>
        </div>
        <div className="mt-8 flex items-end justify-between">
          <p><span className="font-display text-[4.5rem] leading-none text-wine onum">{wins}</span><span className="ml-3 text-ink-soft">victorias</span></p>
          <p><span className="mr-3 text-ink-soft">derrotas</span><span className="font-display text-[4.5rem] leading-none text-ink-faint onum">{losses}</span></p>
        </div>
        <div aria-hidden="true" className="mt-3 flex h-1.5 gap-1">
          {gamesPlayed
            ? <><div className="bg-wine" style={{ flexGrow: wins }} /><div className="bg-sand" style={{ flexGrow: losses }} /></>
            : <div className="flex-1 bg-rule" />}
        </div>
      </div>
      <div className="lg:border-l lg:border-rule lg:pl-12">
        <p className="eyebrow">Precisión según el coach</p>
        <div aria-hidden="true" className="mt-12 h-0.5 w-20 bg-sand" />
        <p className="mt-10 max-w-xs text-ink-soft">Aparece cuando el coach haya revisado tus partidas.</p>
      </div>
    </section>
  );
}
