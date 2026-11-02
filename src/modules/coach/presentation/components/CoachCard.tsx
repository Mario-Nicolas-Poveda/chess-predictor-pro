'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Section';
import { MIN_PLIES_FOR_REVIEW, type GameReviewDTO } from '@/modules/coach/infrastructure/dto/coachSchemas';
import { useReview } from '../hooks/useCoachJobs';
import type { JobView } from '../lib/jobController';
import { TIP_CATEGORY_UI } from '../lib/moveClass';
import { ClassPills } from './ClassPills';
import { TIP_ICON } from './CoachTips';

const BOX = 'flex w-full max-w-[620px] flex-col gap-3 rounded-[14px] border border-rule bg-vellum p-[18px]';
const TITLE = <h2 id="coach-card" className="font-mono text-[11px] font-medium uppercase tracking-[.12em] text-ink-soft">Entrenador</h2>;

/** Tarjeta de la pantalla de resultado. Una partida muy corta no se pide: el servidor respondería 422. */
export function CoachCard({ matchId, ply }: { matchId: string; ply: number }) {
  if (ply < MIN_PLIES_FOR_REVIEW) return (
    <section aria-labelledby="coach-card" className={BOX}>
      {TITLE}
      <p className="text-[15px] text-ink-soft">La partida fue muy corta para analizarla.</p>
    </section>
  );
  return <LiveCoachCard matchId={matchId} />;
}

function LiveCoachCard({ matchId }: { matchId: string }) {
  const { view, request } = useReview(matchId, { auto: true });
  return <CoachCardView matchId={matchId} view={view} onRetry={() => void request()} />;
}

type ViewProps = { matchId: string; view: JobView<GameReviewDTO>; onRetry: () => void };

export function CoachCardView({ matchId, view, onRetry }: ViewProps) {
  const data = view.kind === 'ready' ? view.data : null;
  const accuracy = data?.analysis?.[data.yourColor].accuracy;
  return (
    // min-h: el alto de la tarjeta con el consejo más largo, para que el resultado no salte al llegar el análisis
    <section aria-labelledby="coach-card" aria-busy={view.kind === 'loading' || view.kind === 'pending'} className={`${BOX} min-h-[404px] sm:min-h-[340px]`}>
      {TITLE}
      <p aria-live="polite" className="sr-only">{accuracy === undefined ? '' : `Análisis listo: precisión ${accuracy} %.`}</p>
      <Body matchId={matchId} view={view} onRetry={onRetry} />
    </section>
  );
}

function Body({ matchId, view, onRetry }: ViewProps) {
  switch (view.kind) {
    case 'loading':
    case 'pending': return (
      <>
        <p className="text-[15px]">Tu entrenador está revisando la partida…</p>
        <div className="relative h-[3px] overflow-hidden rounded-sm bg-rule"><span className="animate-slide absolute inset-y-0 left-0 w-2/5 rounded-sm bg-accent" /></div>
        <Skeleton className="h-10 w-[45%]" />
        <Skeleton className="h-3.5 w-[90%]" />
        <Skeleton className="h-3.5 w-[70%]" />
      </>
    );
    case 'ready': return <Ready matchId={matchId} review={view.data} />;
    case 'none':
    case 'failed': return (
      <>
        <p className="text-[15px]">No se pudo analizar la partida.</p>
        <Button variant="ghost" className="self-start" onClick={onRetry}>Reintentar</Button>
      </>
    );
    case 'unavailable': return <p className="text-[15px] text-ink-soft">{view.code === 'GAME_TOO_SHORT' ? 'La partida fue muy corta para analizarla.' : view.message}</p>;
    case 'limited': return <p className="text-[15px] text-ink-soft">Llegaste al límite de análisis de hoy.</p>;
    case 'offline': return <p className="text-[15px] text-ink-soft">Sin conexión. Reintentando…</p>;
  }
}

function Ready({ matchId, review }: { matchId: string; review: GameReviewDTO }) {
  const { analysis, coach } = review;
  if (!analysis || !coach) return null;
  const you = analysis[review.yourColor], rival = analysis[review.yourColor === 'white' ? 'black' : 'white'], tip = coach.tips[0];
  const Icon = tip && TIP_ICON[tip.category];
  return (
    <div className="flex grow flex-col gap-3 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-[40px] font-semibold leading-none">{you.accuracy} %</span>
          <span className="font-mono text-xs text-ink-soft">Tu precisión · rival {rival.accuracy} %</span>
        </div>
        <ClassPills counts={you.counts} />
      </div>
      {tip && Icon && (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[.1em] text-ink-soft">
            <Icon size={14} aria-hidden="true" />{TIP_CATEGORY_UI[tip.category].label}
          </span>
          <h3 className="font-display text-[22px] font-semibold leading-tight">{tip.title}</h3>
          <p className="line-clamp-3 text-[15px] leading-normal">{tip.body}</p>
        </div>
      )}
      <Link href={`/dashboard/partidas/${matchId}?tab=analisis`} className="mt-auto inline-flex min-h-11 items-center self-start font-medium underline underline-offset-4">Ver análisis completo ›</Link>
    </div>
  );
}
