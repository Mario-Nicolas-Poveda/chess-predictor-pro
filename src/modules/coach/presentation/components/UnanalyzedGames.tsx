'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, buttonClass } from '@/components/ui/Button';
import type { MatchListItem } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { useMatchHistory } from '@/modules/arena/presentation/hooks/useMatchHistory';
import { OUTCOME_TITLE, dayLabel } from '@/modules/arena/presentation/reasons';
import { MIN_PLIES_FOR_REVIEW } from '@/modules/coach/infrastructure/dto/coachSchemas';
import { useReview } from '../hooks/useCoachJobs';

const NOTE = 'font-mono text-[13px] font-medium';
const SOFT = `${NOTE} text-ink-soft`;
const fits = (i: MatchListItem) => i.plies >= MIN_PLIES_FOR_REVIEW;

/** Primero las que se pueden analizar: unas cuantas partidas muy cortas no deben tapar las demás. */
export const toAnalyze = (items: MatchListItem[]) =>
  items.filter(i => i.review === null).sort((a, b) => Number(fits(b)) - Number(fits(a))).slice(0, 10);

/** Las partidas por analizar. Cada una que queda lista vuelve a pedir el plan: con 3, la página pasa sola al plan. */
export function UnanalyzedGames({ onAnalyzed }: { onAnalyzed: () => void }) {
  const { items, error } = useMatchHistory(undefined);
  const [now] = useState(() => Date.now());
  if (error) return <p role="alert" className="text-ink-soft">{error}</p>;
  if (!items) return <p aria-busy="true" className="text-ink-soft">Cargando partidas…</p>;
  const rows = toAnalyze(items);
  if (!rows.length) return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-[15px]">Juega una partida (contra la IA o contra alguien) y vuelve aquí.</p>
      <Link href="/dashboard/play" className={buttonClass()}>Jugar</Link>
    </div>
  );
  return (
    <section aria-labelledby="pending-title" className="flex flex-col rounded-[14px] border border-rule bg-vellum p-4">
      <h2 id="pending-title" className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[.12em] text-ink-soft">Partidas sin analizar</h2>
      <ul className="flex flex-col">
        {rows.map(i => (
          <li key={i.id} className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-rule py-1.5">
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-semibold">{i.opponent.username}</span>
              <span className="font-mono text-xs text-ink-soft">{dayLabel(i.endedAt, now)} · {OUTCOME_TITLE[i.outcome].slice(0, -1)}</span>
            </span>
            {fits(i) ? <AnalyzeAction matchId={i.id} onAnalyzed={onAnalyzed} /> : <span className={SOFT}>Muy corta</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AnalyzeAction({ matchId, onAnalyzed }: { matchId: string; onAnalyzed: () => void }) {
  const { view, request } = useReview(matchId);
  const ready = view.kind === 'ready';
  useEffect(() => { if (ready) onAnalyzed(); }, [ready, onAnalyzed]);
  switch (view.kind) {
    case 'loading': return null;
    case 'none': return <Button variant="ghost" onClick={() => void request()}>Analizar</Button>;
    case 'pending': return <span className={`${SOFT} inline-flex items-center gap-2`}><span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-accent" />Analizando…</span>;
    case 'ready': {
      const a = view.data.analysis;
      return <span className={NOTE}>Listo · {a?.[view.data.yourColor].accuracy} %</span>;
    }
    case 'failed': return <Button variant="ghost" onClick={() => void request()}>Reintentar</Button>;
    case 'unavailable': return <span className={SOFT}>{view.code === 'GAME_TOO_SHORT' ? 'Muy corta' : 'No disponible'}</span>;
    case 'limited': return <span className={SOFT}>Límite de hoy</span>;
    case 'offline': return <span className={SOFT}>Sin conexión</span>;
  }
}
