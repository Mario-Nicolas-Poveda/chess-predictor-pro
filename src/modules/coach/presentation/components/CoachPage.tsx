'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Section';
import { ago } from '@/modules/arena/presentation/reasons';
import { MIN_GAMES_FOR_PLAN, type CoachSummaryDTO } from '@/modules/coach/infrastructure/dto/coachSchemas';
import { useCoachSummary } from '../hooks/useCoachJobs';
import type { JobView } from '../lib/jobController';
import { AccuracyTrend } from './AccuracyTrend';
import { ErrorsByPhase } from './ErrorsByPhase';
import { OpeningsTable } from './OpeningsTable';
import { PlanFocus } from './PlanFocus';
import { StatTiles } from './StatTiles';
import { TopMotifs } from './TopMotifs';
import { UnanalyzedGames } from './UnanalyzedGames';

const PAGE = 'mx-auto flex max-w-[1120px] flex-col gap-6 px-5 pb-16 pt-8 lg:px-8';
const EYEBROW = 'font-mono text-[11px] font-medium uppercase tracking-[.12em] text-ink-soft';
const H1 = 'font-display text-[44px] font-semibold leading-[1.05]';
const SOURCE_NOTE = { llm: 'Escrito por un modelo de lenguaje. Puede equivocarse.', template: 'Consejos automáticos.' };

const dataOf = (v: JobView<CoachSummaryDTO>) =>
  v.kind === 'ready' || v.kind === 'pending' || v.kind === 'failed' ? v.data : v.kind === 'limited' || v.kind === 'offline' ? v.last : null;

/** El aviso de la píldora: el plan anterior sigue a la vista mientras tanto. */
const pillOf = (v: JobView<CoachSummaryDTO>) =>
  v.kind === 'pending' ? 'Actualizando con tus partidas nuevas…'
  : v.kind === 'limited' ? 'Ya actualizaste tu plan varias veces hoy.'
  : v.kind === 'offline' ? 'Sin conexión. Reintentando…' : null;

/** /dashboard/coach: el plan y las estadísticas salen del servidor; aquí no se recalcula nada. */
export function CoachPage() {
  const { view, request } = useCoachSummary();
  return <CoachPageView view={view} onRetry={() => void request()} onAnalyzed={request} />;
}

export function CoachPageView({ view, onRetry, onAnalyzed }: { view: JobView<CoachSummaryDTO>; onRetry: () => void; onAnalyzed: () => void }) {
  const d = dataOf(view);
  if (d?.plan && d.stats) return <Plan summary={d} plan={d.plan} stats={d.stats} view={view} onRetry={onRetry} />;
  if (view.kind === 'unavailable' && view.code === 'NOT_ENOUGH_GAMES') return <Empty games={Number(view.meta?.games) || 0} needed={Number(view.meta?.needed) || MIN_GAMES_FOR_PLAN} onAnalyzed={onAnalyzed} />;
  if (view.kind === 'loading' || view.kind === 'pending') return <Preparing title={view.kind === 'pending' ? 'Preparando tu plan…' : 'Entrenador'} />;
  return (
    <div className={PAGE}>
      <p className={EYEBROW}>Entrenador</p>
      {view.kind === 'unavailable' ? <h1 className={H1}>{view.message}</h1>
        : view.kind === 'limited' || view.kind === 'offline' ? <h1 className={H1}>{pillOf(view)}</h1>
        : <>
            <h1 className={H1}>No se pudo preparar tu plan.</h1>
            <div><Button variant="ghost" onClick={onRetry}>Reintentar</Button></div>
          </>}
    </div>
  );
}

function Plan({ summary, plan, stats, view, onRetry }: {
  summary: CoachSummaryDTO; plan: NonNullable<CoachSummaryDTO['plan']>; stats: NonNullable<CoachSummaryDTO['stats']>;
  view: JobView<CoachSummaryDTO>; onRetry: () => void;
}) {
  const [now] = useState(() => Date.now());
  const pill = pillOf(view);
  return (
    <div className={`${PAGE} animate-rise`}>
      <div className="flex flex-col gap-2">
        <p className={EYEBROW}>Entrenador · tus últimas {summary.basedOn} partidas</p>
        <h1 className="max-w-[820px] font-display text-[clamp(44px,5vw,52px)] font-semibold leading-[1.05]">{plan.headline}</h1>
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
          <p className="font-mono text-xs text-ink-soft">Actualizado {ago(summary.updatedAt, now)} · {SOURCE_NOTE[plan.source]}</p>
          <div aria-live="polite">
            {pill && (
              <span className="inline-flex h-[30px] items-center gap-2 rounded-full bg-band px-3 font-mono text-xs font-medium shadow-[inset_0_0_0_1px_var(--t-rule)]">
                <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-accent motion-reduce:animate-none" />{pill}
              </span>
            )}
            {view.kind === 'failed' && <Button variant="ghost" onClick={onRetry}>No se pudo actualizar. Reintentar</Button>}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <PlanFocus plan={plan} />
        <section aria-label="Tus números" className="flex min-w-0 flex-[5_1_340px] flex-col gap-3">
          <StatTiles stats={stats} basedOn={summary.basedOn} />
          <AccuracyTrend points={stats.accuracyTrend} />
          <ErrorsByPhase data={stats.errorsByPhase} />
        </section>
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <TopMotifs motifs={stats.topMotifs} />
        <OpeningsTable openings={stats.openings} />
      </div>
    </div>
  );
}

function Preparing({ title }: { title: string }) {
  return (
    <div aria-busy="true" className={PAGE}>
      <p className={EYEBROW}>Entrenador</p>
      <h1 className={H1}>{title}</h1>
      <div aria-hidden="true" className="flex flex-wrap gap-6">
        <div className="flex flex-[7_1_480px] flex-col gap-3"><Skeleton className="h-[110px]" /><Skeleton className="h-[110px]" /></div>
        <div className="flex flex-[5_1_340px] flex-col gap-3"><Skeleton className="h-20" /><Skeleton className="h-[170px]" /></div>
      </div>
    </div>
  );
}

function Empty({ games, needed, onAnalyzed }: { games: number; needed: number; onAnalyzed: () => void }) {
  return (
    <div className={PAGE}>
      <div className="flex max-w-[720px] flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className={EYEBROW}>Entrenador</p>
          <h1 className={H1}>Tu plan aparece con {needed} partidas analizadas.</h1>
        </div>
        <div className="flex items-center gap-3.5">
          <div role="meter" aria-label="Partidas analizadas" aria-valuemin={0} aria-valuemax={needed} aria-valuenow={games} aria-valuetext={`${games} de ${needed}`}
            className="h-2 flex-[0_1_220px] overflow-hidden rounded bg-rule">
            <span className="block h-full rounded bg-accent" style={{ width: `${(games / needed) * 100}%` }} />
          </div>
          <span className="font-mono text-[13px] font-medium">{games} de {needed}</span>
        </div>
        <UnanalyzedGames onAnalyzed={onAnalyzed} />
      </div>
    </div>
  );
}
