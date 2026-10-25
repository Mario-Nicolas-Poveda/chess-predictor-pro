'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useProfile } from '@/modules/dashboard/presentation/hooks/useProfile';
import { TIME_CONTROL_LABEL } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { useMatchHistory, type ResultFilter } from '../hooks/useMatchHistory';
import { OUTCOME_TITLE, REASON_SHORT, dayLabel } from '../reasons';

const FILTERS = [{ id: undefined, label: 'Todas' }, { id: 'win', label: 'Victorias' }, { id: 'loss', label: 'Derrotas' }, { id: 'draw', label: 'Tablas' }] as const;
const asFilter = (v: string | null): ResultFilter => (v === 'win' || v === 'loss' || v === 'draw' ? v : undefined);
const MARK = { win: 'bg-accent', loss: 'bg-loss', draw: 'bg-ink-faint' } as const;
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0');

/** Cabecera de /dashboard/partidas: resumen de profile.stats y filtro (?result=). */
export function HistoryHeader() {
  const { profile } = useProfile();
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  const result = asFilter(params.get('result'));
  const st = profile?.stats;
  const pick = (id: ResultFilter) => router.replace(id ? `${pathname}?result=${id}` : pathname, { scroll: false });
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
      <div className="flex flex-col gap-3">
        <p className="eyebrow">Partidas</p>
        <h1 className="font-display text-[clamp(56px,7vw,84px)] font-semibold leading-[.95] tracking-[-.02em]">Tus partidas.</h1>
        <p className="min-h-[27px] text-lg text-ink-soft nums">
          {st && `${st.gamesPlayed} ${st.gamesPlayed === 1 ? 'partida' : 'partidas'} · ${st.wins} victorias · ${st.losses} derrotas · ${st.draws} tablas. Elige una y recórrela jugada a jugada.`}
        </p>
      </div>
      <div role="radiogroup" aria-label="Filtrar por resultado" className="flex flex-wrap gap-1">
        {FILTERS.map(f => (
          <button key={f.label} type="button" role="radio" aria-checked={result === f.id} onClick={() => pick(f.id)}
            className={`h-11 rounded-full px-5 font-medium ${result === f.id ? 'bg-ink text-paper' : 'hover:bg-band'}`}>{f.label}</button>
        ))}
      </div>
    </div>
  );
}

/** Lista de partidas; vive en el layout y no se vuelve a montar al cambiar de partida. Sin partida elegida abre la más reciente. */
export function MatchHistoryList() {
  const params = useSearchParams(), router = useRouter();
  const { matchId } = useParams<{ matchId?: string }>();
  const result = asFilter(params.get('result'));
  const h = useMatchHistory(result);
  const [now] = useState(() => Date.now());
  const qs = result ? `?result=${result}` : '';
  const first = h.items?.[0]?.id;
  useEffect(() => { if (!matchId && first) router.replace(`/dashboard/partidas/${first}${qs}`, { scroll: false }); }, [matchId, first, qs, router]);

  if (h.error && !h.items) return <p role="alert" className="text-ink-soft">{h.error}</p>;
  if (!h.items) return <p aria-busy="true" className="text-ink-soft">Cargando partidas…</p>;
  if (!h.items.length) return (
    <p className="text-ink-soft">
      {result ? 'No hay partidas con ese resultado.' : <>Aún no has jugado. <Link href="/dashboard/play" className="text-accent underline-offset-4 hover:underline">Buscar partida ›</Link></>}
    </p>
  );
  return (
    <nav aria-labelledby="recent" className="flex flex-col gap-3">
      <h2 id="recent" className="font-mono text-[11px] font-normal uppercase tracking-[.14em] text-ink-faint">Recientes</h2>
      <ul className="flex flex-col gap-1">
        {h.items.map(i => {
          const on = i.id === matchId, t = TIME_CONTROL_LABEL[i.timeControl];
          return (
            <li key={i.id}>
              <Link href={`/dashboard/partidas/${i.id}${qs}`} scroll={false} aria-current={on ? 'page' : undefined}
                className={`grid grid-cols-[6px_auto_minmax(0,1fr)_auto] items-center gap-x-4 rounded-2xl px-4 py-3.5 ${on ? 'bg-band' : 'hover:bg-band/60'}`}>
                <span aria-hidden="true" className={`h-10 rounded-full ${MARK[i.outcome]}`} />
                <Avatar user={i.opponent} size={32} className="bg-band text-ink" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">contra {i.opponent.username}</span>
                  <span className="truncate text-[15px] text-ink-soft">
                    {OUTCOME_TITLE[i.outcome].slice(0, -1)} · {REASON_SHORT[i.reason]} · {t.label} · {Math.ceil(i.plies / 2)} jugadas
                  </span>
                </span>
                <span className="flex flex-col items-end font-mono nums">
                  <span className={i.eloDelta > 0 ? 'font-medium text-accent' : 'text-ink-soft'}>{signed(i.eloDelta)}</span>
                  <span className="text-xs text-ink-faint">{dayLabel(i.endedAt, now)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {h.nextBefore && <div><Button variant="ghost" loading={h.loadingMore} onClick={h.loadMore}>Cargar más</Button></div>}
    </nav>
  );
}
