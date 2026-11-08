'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Section';
import type { GameOutcome, RankingPage as Page, RankingRow } from '@/modules/ranking/infrastructure/dto/rankingSchemas';
import { useRanking, type Busy, type Problem, type Sort } from '../hooks/useRanking';
import { LOCKED_TEXT, askAccount } from '@/modules/auth/presentation/lib/accountRequired';
import { useRole } from '@/modules/dashboard/presentation/hooks/useProfile';

const EYEBROW = 'font-mono text-[11px] font-medium uppercase tracking-[.12em] text-ink-soft';
const TH = 'px-2 py-3 font-mono text-xs font-medium';
const WIDE = 'hidden md:table-cell';
const SORTS: [Sort, string][] = [['elo', 'ELO'], ['wins', 'Victorias']];
const OUTCOME: Record<GameOutcome, [string, string, string]> = {
  win: ['V', 'victoria', 'bg-ink text-paper'],
  draw: ['T', 'tablas', 'bg-band text-ink'],
  loss: ['D', 'derrota', 'text-ink-soft shadow-[inset_0_0_0_1px_var(--t-rule)]'],
};

const ord = (n: number) => `${n}.º`;
// espacios duros: el renglón no se parte entre número y letra
const record = (r: RankingRow) => `${r.wins} V · ${r.draws} T · ${r.losses} D · ${r.winRate} %`;

/** Flechas del radiogroup: cualquiera cambia al otro orden (son dos). */
export const nextSort = (key: string, sort: Sort): Sort | null =>
  ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key) ? (sort === 'elo' ? 'wins' : 'elo') : null;

/** /dashboard/ranking: el servidor ordena, busca y pagina; aquí solo se muestra. */
export function RankingPage() {
  const r = useRanking();
  return <RankingView sort={r.sort} onSort={r.setSort} q={r.q} onQ={r.setQ} data={r.data} busy={r.busy} problem={r.problem} onMore={r.more} onRetry={r.retry} />;
}

type ViewProps = {
  sort: Sort; onSort: (s: Sort) => void; q: string; onQ: (q: string) => void;
  data: Page | null; busy: Busy; problem: Problem; onMore: () => void; onRetry: () => void;
};

export function RankingView({ sort, onSort, q, onQ, data, busy, problem, onMore, onRetry }: ViewProps) {
  const you = data?.you.row ?? null;
  const youLoaded = !!you && !!data?.items.some(r => r.player.id === you.player.id);
  const youRef = useRef<HTMLTableRowElement>(null);
  const [youSeen, setYouSeen] = useState(false);
  useEffect(() => {
    const el = youRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setYouSeen(!!e?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [youLoaded]);
  const showPin = !!you && !(youLoaded && youSeen);

  const radios = useRef<Partial<Record<Sort, HTMLButtonElement | null>>>({});
  const onSortKey = (e: KeyboardEvent) => {
    const next = nextSort(e.key, sort);
    if (!next) return;
    e.preventDefault();
    onSort(next);
    radios.current[next]?.focus();
  };

  const podium = data && sort === 'elo' && !data.q && data.items[0]?.rank === 1 && data.items.length >= 3 ? data.items.slice(0, 3) : [];

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-5 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-2">
          <p className={EYEBROW}>Ranking global · partidas con ELO</p>
          <h1 className="font-display text-[clamp(36px,6vw,56px)] font-semibold leading-none">Los mejores de la casa.</h1>
          <p className="max-w-[560px] text-ink-soft">Solo cuentan las partidas con ELO entre personas (la IA no cuenta). Hacen falta 5 para aparecer.</p>
        </div>
        {data && <YourCard data={data} />}
      </div>

      {problem && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-band px-4 py-2 text-[15px]">
          <span>{problem === 'offline' ? 'Sin conexión.' : 'No se pudo cargar el ranking.'}{data && ' Ves lo último que se cargó.'}</span>
          <Button variant="ghost" className="h-11!" onClick={onRetry}>Reintentar</Button>
        </div>
      )}

      {!data ? (problem ? null : <Loading />) : (
        <div aria-busy={busy === 'replace' || undefined} className="flex flex-col gap-5">
          {podium.length === 3 && (
            <ol aria-label="Podio" className="hidden grid-cols-3 items-end gap-3 md:grid">
              {podium.map((r, i) => (
                <li key={r.player.id} className={`flex flex-col justify-end gap-1.5 rounded-[14px] border border-rule p-[18px] ${
                  ['order-2 min-h-[176px] bg-accent text-on-accent', 'order-1 min-h-[152px] bg-vellum', 'order-3 min-h-[136px] bg-vellum'][i]}`}>
                  <span className="font-display text-[44px] font-semibold leading-none">{ord(r.rank)}</span>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar user={r.player} size={34} className={i === 0 ? 'bg-on-accent text-accent' : 'bg-band text-ink'} />
                    <span className="truncate text-[17px] font-semibold">{r.player.username}</span>
                  </span>
                  <span className="font-mono text-[13px] opacity-85">ELO {r.player.elo} · {r.wins} V · {r.losses} D</span>
                </li>
              ))}
            </ol>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span id="orden-label" className="font-mono text-xs font-medium text-ink-soft">Ordenar por</span>
              <div role="radiogroup" aria-labelledby="orden-label" onKeyDown={onSortKey} className="flex rounded-full bg-band p-[3px]">
                {SORTS.map(([id, name]) => (
                  <button key={id} ref={el => { radios.current[id] = el; }} type="button" role="radio" aria-checked={sort === id} tabIndex={sort === id ? 0 : -1}
                    onClick={() => onSort(id)}
                    className={`h-11 min-w-24 rounded-full px-3.5 font-mono text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${sort === id ? 'bg-ink text-paper' : 'text-ink'}`}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor="buscar" className="font-mono text-xs font-medium text-ink-soft">Buscar jugador</label>
              <input id="buscar" type="search" value={q} onChange={e => onQ(e.target.value)} maxLength={30} placeholder="nombre de usuario" autoComplete="off"
                className="h-11 w-[220px] min-w-0 rounded-full bg-vellum px-3.5 text-[15px] text-ink shadow-[inset_0_0_0_1px_var(--t-rule)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink max-[400px]:flex-1" />
            </div>
          </div>

          <div className="rounded-[14px] border border-rule bg-vellum">
            <div tabIndex={0} role="region" aria-label="Tabla del ranking" className="overflow-x-auto rounded-[14px] focus-visible:outline-2 focus-visible:outline-ink">
              <table className="w-full border-collapse text-[15px] md:min-w-[640px]">
                <caption className="sr-only">Ranking global ordenado por {sort === 'elo' ? 'ELO' : 'victorias'}{data.q && `, buscando «${data.q}»`}</caption>
                <thead>
                  <tr className="text-left text-ink-soft">
                    <th scope="col" className={`${TH} w-12 pl-3 md:w-16 md:pl-4`}>Puesto</th>
                    <th scope="col" className={TH}>Jugador</th>
                    <th scope="col" aria-sort={sort === 'elo' ? 'descending' : undefined} className={`${TH} pr-4 text-right md:pr-2`}>ELO</th>
                    <th scope="col" className={`${TH} ${WIDE} text-right`}>Partidas</th>
                    <th scope="col" aria-sort={sort === 'wins' ? 'descending' : undefined} className={`${TH} ${WIDE} text-right`}>V – T – D</th>
                    <th scope="col" className={`${TH} ${WIDE} text-right`}>% victorias</th>
                    <th scope="col" className={`${TH} ${WIDE} pr-4`}>Últimas 5</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(r => {
                    const mine = r.player.id === you?.player.id;
                    return (
                      <tr key={r.player.id} ref={mine ? youRef : undefined} className={`border-t border-rule ${mine ? 'bg-band' : ''}`}>
                        <td className="py-2.5 pl-3 pr-2 font-mono text-sm font-semibold md:pl-4">{r.rank}</td>
                        <th scope="row" className="px-2 py-2.5 text-left font-medium">
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className="hidden md:block"><Avatar user={r.player} size={30} className="bg-band text-ink" /></span>
                            <span className="flex min-w-0 flex-col">
                              <span className={`flex min-w-0 items-center gap-2 ${mine ? 'font-semibold' : ''}`}>
                                <span className="truncate">{r.player.username}</span>
                                {mine && <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[11px] font-semibold text-paper">Tú</span>}
                              </span>
                              <span className="whitespace-nowrap font-mono text-[11px] font-normal text-ink-soft md:hidden">{record(r)}</span>
                            </span>
                          </span>
                        </th>
                        <td className="py-2.5 pl-2 pr-4 text-right font-mono text-sm font-semibold md:pr-2">{r.player.elo}</td>
                        <td className={`${WIDE} p-2 text-right font-mono text-sm`}>{r.games}</td>
                        <td className={`${WIDE} p-2 text-right font-mono text-sm`}>{r.wins} – {r.draws} – {r.losses}</td>
                        <td className={`${WIDE} p-2 text-right font-mono text-sm`}>{r.winRate} %</td>
                        <td className={`${WIDE} py-2 pl-2 pr-4`}><Last5 last={r.last5} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.q && data.total === 0 && (
              <p className="border-t border-rule px-4 py-5 text-ink-soft">Nadie se llama así: «{data.q}».</p>
            )}
          </div>

          {showPin && you && (
            <div role="group" aria-label="Tu fila en el ranking"
              className="sticky bottom-0 z-10 -mx-4 flex min-h-[60px] items-center gap-3 bg-accent px-4 text-on-accent sm:mx-0 sm:rounded-[14px]">
              <span className="w-9 shrink-0 font-mono text-[13px] font-semibold">{ord(you.rank)}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-bold">{you.player.username} · Tú</span>
                <span className="font-mono text-xs">{record(you)}</span>
              </span>
              <span className="font-mono text-[15px] font-semibold">{you.player.elo}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span aria-live="polite" className="font-mono text-[13px] text-ink-soft">
              {data.q ? `${data.total} ${data.total === 1 ? 'jugador encontrado' : 'jugadores encontrados'}`
                : `${data.items.length ? 1 : 0}–${data.items.length} de ${data.players} jugadores`}
            </span>
            {data.items.length < data.total && (
              <Button variant="ghost" className="h-11! max-sm:w-full" loading={busy === 'more'} onClick={onMore}>Mostrar 10 más</Button>
            )}
          </div>
          <p className="font-mono text-xs text-ink-soft">Empate en ELO: va primero quien tiene más victorias. Se actualiza al terminar cada partida con ELO.</p>
        </div>
      )}
    </div>
  );
}

function YourCard({ data }: { data: Page }) {
  const { row, games, needed } = data.you;
  const guest = useRole() === 'guest';
  return (
    <section aria-labelledby="tu-pos" className="flex min-w-[260px] flex-[0_1_340px] flex-col gap-2 rounded-[14px] border border-rule bg-vellum px-[18px] py-4 max-sm:flex-1">
      <h2 id="tu-pos" className={EYEBROW}>Tu posición</h2>
      {guest ? (
        <>
          <p className="text-[15px]">Los invitados no aparecen en el ranking. {LOCKED_TEXT.ranking}</p>
          <button type="button" onClick={() => askAccount('ranking')}
            className="inline-flex min-h-11 items-center self-start font-semibold underline-offset-[5px] hover:underline">Crear cuenta ›</button>
        </>
      ) : row ? (
        <>
          <p className="flex items-baseline gap-3">
            <span className="font-display text-5xl font-semibold leading-none">{ord(row.rank)}</span>
            <span className="font-mono text-[13px] text-ink-soft">de {data.players} · ELO {row.player.elo}</span>
          </p>
          <p className="font-mono text-[13px]">{record(row)} de victorias</p>
        </>
      ) : (
        <>
          <p className="text-[15px]">Aún no apareces. Te {needed - games === 1 ? 'falta 1 partida' : `faltan ${needed - games} partidas`} con ELO.</p>
          <div className="flex items-center gap-2.5">
            <div role="meter" aria-label="Partidas con ELO" aria-valuemin={0} aria-valuemax={needed} aria-valuenow={games} aria-valuetext={`${games} de ${needed}`}
              className="h-2 flex-1 overflow-hidden rounded bg-band">
              <span className="block h-full rounded bg-accent" style={{ width: `${Math.min(100, (games / needed) * 100)}%` }} />
            </div>
            <span className="font-mono text-[13px] font-medium">{games} de {needed} partidas</span>
          </div>
          <Link href="/dashboard/play" className="inline-flex min-h-11 items-center self-start font-semibold underline-offset-[5px] hover:underline">Buscar partida ›</Link>
        </>
      )}
    </section>
  );
}

/** Cuadritos con letra (no solo color), de la más vieja a la más nueva como se leen. */
export function Last5({ last }: { last: GameOutcome[] }) {
  const old = [...last].reverse();
  return (
    <span role="img" aria-label={`Últimas ${old.length}, de la más vieja a la más nueva: ${old.map(o => OUTCOME[o][1]).join(', ')}`} className="inline-flex gap-1">
      {old.map((o, i) => (
        <span key={i} aria-hidden="true" className={`grid size-5 place-items-center rounded font-mono text-[11px] font-semibold ${OUTCOME[o][2]}`}>{OUTCOME[o][0]}</span>
      ))}
    </span>
  );
}

function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando el ranking" className="flex flex-col gap-3">
      <div className="hidden grid-cols-3 items-end gap-3 md:grid">
        <Skeleton className="h-[152px] rounded-[14px]" /><Skeleton className="h-[176px] rounded-[14px]" /><Skeleton className="h-[136px] rounded-[14px]" />
      </div>
      <Skeleton className="h-11 rounded-full" />
      {Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-[51px] rounded-[10px]" />)}
    </div>
  );
}
