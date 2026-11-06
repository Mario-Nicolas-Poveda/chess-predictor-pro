'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { Button, buttonClass } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Section';
import type { PollProblem } from '@/lib/etagPoller';
import type { NextTournamentGame, TournamentListResponse, TournamentSummary } from '@/modules/tournaments/infrastructure/dto/tournamentSchemas';
import { useTournamentList, type CardUi } from '../hooks/useTournamentList';
import { nextGameText } from '../lib/bracketText';
import { fmtCountdown } from '../lib/deadline';

const EYEBROW = 'font-mono text-[11px] font-medium uppercase tracking-[.12em] text-ink-soft';
const OUTLINE = 'inline-flex min-h-11 items-center rounded-full px-[18px] text-[15px] font-semibold text-ink shadow-[inset_0_0_0_1px_var(--t-ink)] hover:bg-band';
const LINK = 'min-h-11 px-1.5 text-sm font-medium underline underline-offset-4';

const tc = (t: TournamentSummary['timeControl']) => t.replace('+', ' + ');
const strip = (s: string) => s.replace('.', '');
const day = (iso: string) => {
  const d = new Date(iso);
  return `${strip(d.toLocaleDateString('es-CO', { weekday: 'short' }))} ${d.getDate()} ${strip(d.toLocaleDateString('es-CO', { month: 'short' }))}`;
};
const time = (iso: string) => new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
const sameDay = (iso: string, nowMs: number) => new Date(iso).toDateString() === new Date(nowMs).toDateString();
export const bracketHref = (id: string) => `/dashboard/tournaments/${id}`;

/** Un reloj que avanza cada segundo, ya corregido con la hora del servidor. En el prerender vale 0 (sin datos no se usa). */
const tick = (cb: () => void) => { const iv = setInterval(cb, 1000); return () => clearInterval(iv); };
const second = () => Math.floor(Date.now() / 1000) * 1000;
function useNow(skewMs: number) {
  return useSyncExternalStore(tick, second, () => 0) + skewMs;
}

/** /dashboard/tournaments: la lista y la inscripción; el servidor decide cupos, estados y plazos. */
export function TournamentsPage() {
  const l = useTournamentList();
  const nowMs = useNow(l.skew);
  return <TournamentsView data={l.view.data} problem={l.view.problem} ui={l.ui} nowMs={nowMs}
    onJoin={l.join} onLeave={l.leave} onAsk={l.ask} onRetry={l.retry} />;
}

type ViewProps = {
  data: TournamentListResponse | null; problem: PollProblem | null; ui: Record<string, CardUi>; nowMs: number;
  onJoin: (id: string) => void; onLeave: (id: string) => void; onAsk: (id: string, on: boolean) => void; onRetry: () => void;
};

export function TournamentsView({ data, problem, ui, nowMs, onJoin, onLeave, onAsk, onRetry }: ViewProps) {
  const ts = data?.tournaments ?? [];
  // la tarjeta que acaba de responder 409 CLOSED se queda en su sitio, con su mensaje y "Ver llaves"
  const open = ts.filter(t => t.status === 'open' || (t.status === 'running' && ui[t.id]?.closed));
  const running = ts.filter(t => t.status === 'running' && !ui[t.id]?.closed);
  const done = ts.filter(t => t.status === 'finished' || t.status === 'cancelled');

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-5 lg:px-8">
      <div className="flex flex-col gap-2">
        <p className={EYEBROW}>Torneos</p>
        <h1 className="font-display text-[clamp(36px,6vw,56px)] font-semibold leading-none">Próximos torneos.</h1>
        <p className="max-w-[620px] text-ink-soft">Eliminación directa, una partida por ronda. Las llaves se arman por ELO cuando empieza el torneo.</p>
      </div>

      {problem && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-band px-4 py-2 text-[15px]">
          <span>{problem === 'offline' ? 'Sin conexión.' : 'No se pudo cargar la lista de torneos.'}{data && ' Ves lo último que se cargó.'}</span>
          <Button variant="ghost" className="h-11!" onClick={onRetry}>Reintentar</Button>
        </div>
      )}

      {data?.next && <NextBanner next={data.next} nowMs={nowMs} />}

      {!data ? (problem ? null : <Loading />) : (
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex min-w-0 flex-[2_1_600px] flex-col gap-7">
            <section aria-labelledby="abiertos" className="flex flex-col gap-3">
              <h2 id="abiertos" className={EYEBROW}>Inscripciones abiertas</h2>
              {open.length ? open.map(t => (
                <OpenCard key={t.id} t={t} ui={ui[t.id] ?? {}} nowMs={nowMs} onJoin={onJoin} onLeave={onLeave} onAsk={onAsk} />
              )) : <p className="text-ink-soft">No hay inscripciones abiertas por ahora.</p>}
            </section>

            {running.length > 0 && (
              <section aria-labelledby="enjuego" className="flex flex-col gap-3">
                <h2 id="enjuego" className={EYEBROW}>En juego</h2>
                {running.map(t => (
                  <article key={t.id} aria-labelledby={`t-${t.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 rounded-[14px] border border-rule bg-vellum px-5 py-4">
                    <div className="flex min-w-0 flex-col gap-1">
                      <h3 id={`t-${t.id}`} className="font-display text-2xl font-semibold leading-tight">{t.name}</h3>
                      <span className="inline-flex items-center gap-2 font-mono text-[13px] text-ink-soft">
                        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent motion-safe:animate-pulse" />
                        {sameDay(t.startsAt, nowMs) ? 'Hoy' : day(t.startsAt)} · {tc(t.timeControl)} · {t.players} jugadores{t.stage && ` · ${t.stage.name.toLowerCase()} en juego`}
                      </span>
                    </div>
                    <Link href={bracketHref(t.id)} className={OUTLINE}>Ver llaves ›</Link>
                  </article>
                ))}
              </section>
            )}

            {done.length > 0 && (
              <section aria-labelledby="terminados" className="flex flex-col gap-2">
                <h2 id="terminados" className={EYEBROW}>Terminados</h2>
                <ul className="rounded-[14px] border border-rule bg-vellum">
                  {done.map((t, i) => (
                    <li key={t.id} className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-5 py-3 ${i ? 'border-t border-rule' : ''}`}>
                      <span className="flex min-w-0 flex-col">
                        <span className="font-semibold">{t.name}</span>
                        <span className="font-mono text-xs text-ink-soft">
                          {day(t.endedAt ?? t.startsAt)} · {t.status === 'cancelled' ? 'Cancelado: no hubo 4 inscritos'
                            : `${t.players} jugadores${t.winner ? ` · ganó ${t.winner.username}` : ''}`}
                        </span>
                      </span>
                      {t.status === 'finished' && (
                        <Link href={bracketHref(t.id)} className="inline-flex min-h-11 items-center font-mono text-[13px] font-medium underline underline-offset-[3px]">Ver llaves<span className="sr-only"> de {t.name}</span></Link>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside aria-labelledby="reglas" className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-[14px] bg-band px-5 py-[18px]">
            <h2 id="reglas" className="font-display text-[26px] font-semibold">Cómo funciona</h2>
            <ol className="flex list-decimal flex-col gap-2.5 pl-5 text-[15px] leading-normal">
              <li>Te inscribes hasta la hora de inicio y puedes salir antes de que empiece.</li>
              <li>Al empezar se arman las llaves por ELO: el 1.º contra el último. Si faltan jugadores, los mejores pasan directo.</li>
              <li>Una partida por ronda, con ELO. Quien lleva blancas tiene 5 minutos para hacer su primera jugada; si no, pierde por W.O.</li>
              <li>Si hay tablas, pasa quien jugó con negras.</li>
              <li>Con menos de 4 inscritos el torneo se cancela.</li>
            </ol>
          </aside>
        </div>
      )}
    </div>
  );
}

function NextBanner({ next, nowMs }: { next: NextTournamentGame; nowMs: number }) {
  const n = nextGameText(next, nowMs);
  return (
    <section aria-labelledby="tu-partida" className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-[14px] bg-accent px-5 py-4 text-on-accent">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id="tu-partida" className="text-lg font-semibold">
          <span aria-live="polite">{n.title}</span>
          {n.clock && <> · <span className="font-mono nums">{n.clock}</span></>}
        </h2>
        <p>{next.tournamentName} · {next.stage.name}. {n.text}</p>
      </div>
      <Link href={`/dashboard/arena/${next.matchId}`}
        className="inline-flex min-h-12 items-center rounded-full bg-on-accent px-[22px] font-semibold text-accent">{n.cta} ›</Link>
    </section>
  );
}

function OpenCard({ t, ui, nowMs, onJoin, onLeave, onAsk }: {
  t: TournamentSummary; ui: CardUi; nowMs: number;
  onJoin: (id: string) => void; onLeave: (id: string) => void; onAsk: (id: string, on: boolean) => void;
}) {
  const closed = !!ui.closed || t.status !== 'open';
  const full = !t.joined && !closed && t.players >= t.size;
  const chip = closed ? 'Cerrado' : full ? 'Lleno' : 'Abierto';
  const hid = `t-${t.id}`;
  const left = Date.parse(t.startsAt) - nowMs;
  return (
    <article aria-labelledby={hid} className="flex flex-col gap-3 rounded-[14px] border border-rule bg-vellum px-5 py-[18px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
        <h3 id={hid} className="font-display text-[30px] font-semibold leading-tight">{t.name}</h3>
        <span className={`rounded-full px-3 py-1 font-mono text-xs font-semibold ${chip === 'Abierto' ? 'bg-band text-ink' : 'bg-ink text-paper'}`}>{chip}</span>
      </div>
      <p className="font-mono text-[13px] text-ink-soft">{day(t.startsAt)} · {time(t.startsAt)} · {tc(t.timeControl)} · con ELO · {t.size} jugadores</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <div role="meter" aria-label="Inscritos" aria-valuemin={0} aria-valuemax={t.size} aria-valuenow={t.players} aria-valuetext={`${t.players} de ${t.size} inscritos`} className="flex gap-1">
          {Array.from({ length: t.size }, (_, i) => (
            <span key={i} aria-hidden="true" className={`h-2 w-[22px] rounded-[3px] ${i < t.players ? 'bg-ink' : 'shadow-[inset_0_0_0_1px_var(--t-soft)]'}`} />
          ))}
        </div>
        <span className="font-mono text-[13px] font-medium">{t.players} de {t.size} inscritos</span>
        <span className="font-mono text-[13px] text-ink-soft">{closed || left <= 0 ? 'Ya empezó' : `Empieza en ${fmtCountdown(left)}`}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
        {!t.joined && !closed && !full && (
          <button type="button" aria-disabled={ui.busy === 'join' || undefined} onClick={() => { if (!ui.busy) onJoin(t.id); }}
            className={`${buttonClass('primary')} text-base font-semibold aria-disabled:opacity-70`}>
            {ui.busy === 'join' ? 'Inscribiendo…' : 'Inscribirme'}<span className="sr-only"> en {t.name}</span>
          </button>
        )}
        {t.joined && !closed && (
          <>
            <span className="inline-flex min-h-12 items-center gap-2 rounded-full bg-band px-[18px] text-[15px] font-semibold">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>Inscrito
            </span>
            {ui.ask ? (
              <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-2">
                <span className="text-[15px]">¿Salir del torneo? Liberas tu cupo.</span>
                <button type="button" onClick={() => onLeave(t.id)} className="min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-paper">Sí, salir</button>
                <button type="button" autoFocus onClick={() => onAsk(t.id, false)} className={LINK}>No</button>
              </span>
            ) : (
              <button type="button" aria-disabled={ui.busy === 'leave' || undefined} onClick={() => { if (!ui.busy) onAsk(t.id, true); }} className={LINK}>
                {ui.busy === 'leave' ? 'Saliendo…' : 'Salir del torneo'}<span className="sr-only"> {t.name}</span>
              </button>
            )}
          </>
        )}
        {full && (
          <>
            <button type="button" disabled className="min-h-12 rounded-full bg-band px-6 text-base font-semibold text-ink-soft">Lleno</button>
            <span className="text-sm text-ink-soft">Si alguien sale, se abre un cupo.</span>
          </>
        )}
        {closed && <Link href={bracketHref(t.id)} className={`${OUTLINE} min-h-12`}>Ver llaves ›</Link>}
      </div>
      <p role="status" className={`min-h-[22px] text-sm ${ui.msg?.bad ? 'text-ink' : 'text-ink-soft'}`}>{ui.msg?.text}</p>
    </article>
  );
}

function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando los torneos" className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[190px] rounded-[14px]" />)}
    </div>
  );
}
