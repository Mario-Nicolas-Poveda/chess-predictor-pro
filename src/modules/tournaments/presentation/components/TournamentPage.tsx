'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Section';
import type { PollProblem } from '@/lib/etagPoller';
import { TournamentParamsSchema, type BracketGame, type NextTournamentGame, type TournamentDetail } from '@/modules/tournaments/infrastructure/dto/tournamentSchemas';
import { tournamentsApi } from '../api/tournamentsApi';
import { deadlinesOf, useTournament } from '../hooks/useTournament';
import { useNow } from '../hooks/useNow';
import { leaveError } from '../hooks/useTournamentList';
import { nextGameText } from '../lib/bracketText';
import { fmtCountdown } from '../lib/deadline';
import { day, sameDay, tc } from '../lib/format';
import { BracketColumns, BracketTabs } from './Bracket';

const COLOR = { white: 'blancas', black: 'negras' } as const;

/** Tu id en la llave: el inscrito con tu siembra (el detalle no trae tu id). */
export const youIdOf = (d: TournamentDetail) => (d.you.seed == null ? null : d.entrants.find(e => e.seed === d.you.seed)?.id ?? null);

const mineIn = (g: BracketGame, youId: string) => (g.top.player?.id === youId ? g.top : g.bottom.player?.id === youId ? g.bottom : null);
const rivalIn = (g: BracketGame, youId: string) => (g.top.player?.id === youId ? g.bottom : g.top);

/** Etapas: Inscripciones · (Cuartos) · Semifinal · Final · Terminado, con la actual. */
export function stagesOf(d: TournamentDetail): { labels: string[]; current: number } {
  if (d.status === 'cancelled') return { labels: ['Inscripciones', 'Cancelado'], current: 1 };
  const rounds = d.rounds.length ? d.rounds.map(r => r.name) : (d.size === 8 ? ['Cuartos', 'Semifinal', 'Final'] : ['Semifinal', 'Final']);
  const labels = ['Inscripciones', ...rounds, 'Terminado'];
  const current = d.status === 'open' ? 0 : d.status === 'finished' ? labels.length - 1
    : 1 + Math.max(0, d.rounds.findIndex(r => r.round === d.stage?.round));
  return { labels, current };
}

export type Banner = { title: string; clock?: string | null; text: string; accent: boolean; cta?: { href: string; label: string }; leave?: boolean };

/** El aviso de arriba según el momento del torneo y tu lugar en él. `nowMs` ya corregido con la hora del servidor. */
export function bannerOf(d: TournamentDetail, nowMs: number): Banner | null {
  const youId = youIdOf(d);
  const games = d.rounds.flatMap(r => r.games.map(g => ({ g, round: r.name })));
  const mine = youId ? games.filter(x => mineIn(x.g, youId)) : [];
  if (d.status === 'cancelled') return { title: 'Torneo cancelado', text: 'No hubo 4 inscritos a la hora de empezar.', accent: false };

  if (d.status === 'open') {
    const head = `Inscripciones abiertas · ${d.players} de ${d.size}`;
    const left = Date.parse(d.startsAt) - nowMs;
    const when = left > 0 ? `Empieza en ${fmtCountdown(left)}.` : 'Empezando…';
    if (!d.you.joined || !youId) return { title: head, text: `${when} Inscríbete desde la lista de torneos.`, accent: false, cta: { href: '/dashboard/tournaments', label: 'Ir a Torneos' } };
    const first = mine.find(x => x.g.round === 1)?.g;
    const side = first && mineIn(first, youId);
    const rival = first && rivalIn(first, youId).player;
    const ifNow = !first ? '' : first.bye ? ' Si empezara ahora pasarías directo.'
      : side?.color && rival ? ` Si empezara ahora jugarías con ${COLOR[side.color]} contra ${rival.username}.` : '';
    return { title: head, text: `${when}${ifNow}`, accent: true, leave: true };
  }

  if (d.status === 'finished') {
    const champ = d.winner?.username ?? 'por definir';
    if (!youId || !mine.length) return { title: `Terminó el torneo: ganó ${champ}`, text: 'Así quedaron las llaves.', accent: false };
    const last = mine[mine.length - 1]!;
    const won = !!mineIn(last.g, youId)?.advanced;
    const isFinal = last.round === 'Final';
    const place = won && isFinal ? 'ganaste el torneo' : isFinal ? 'llegaste a la final' : `quedaste fuera en ${last.round.toLowerCase()}`;
    const played = mine.filter(x => !x.g.bye && x.g.decidedBy !== 'noshow').map(x => x.g);
    const w = played.filter(g => mineIn(g, youId)?.score === '1').length;
    const dr = played.filter(g => mineIn(g, youId)?.score === '½').length;
    const l = played.filter(g => mineIn(g, youId)?.score === '0').length;
    return { title: `Terminó el torneo: ${place}`, text: `Ganaste ${w}, empataste ${dr} y perdiste ${l}.`, accent: won && isFinal,
      cta: { href: '/dashboard/partidas', label: 'Ver tus partidas' } };
  }

  // en juego
  if (!youId || !d.you.joined) return null;
  const live = mine.find(x => x.g.matchId && x.g.matchId === d.you.nextMatchId && (x.g.state === 'ready' || x.g.state === 'playing'));
  if (live) {
    const side = mineIn(live.g, youId)!, rival = rivalIn(live.g, youId).player;
    if (rival && side.color) {
      const n: NextTournamentGame = {
        tournamentId: d.id, tournamentName: d.name, matchId: live.g.matchId!, stage: { round: live.g.round, rounds: d.rounds.length, name: live.round },
        color: side.color, opponent: rival, matchStatus: live.g.state === 'playing' ? 'active' : 'pending', deadline: live.g.deadline,
      };
      const t = nextGameText(n, nowMs);
      return { title: t.title, clock: t.clock, text: t.text, accent: true, cta: { href: `/dashboard/arena/${n.matchId}`, label: t.cta } };
    }
  }
  const lost = mine.find(x => x.g.state === 'done' && !mineIn(x.g, youId)?.advanced);
  if (lost) return lost.g.decidedBy === 'noshow'
    ? { title: 'Perdiste tu partida por W.O.', text: 'No hiciste tu primera jugada a tiempo. Puedes seguir el torneo desde aquí.', accent: false }
    : { title: `Quedaste fuera en ${lost.round.toLowerCase()}`, text: 'Puedes seguir el torneo desde aquí.', accent: false };
  return { title: 'Pasaste de ronda', text: 'Tu próxima partida se arma sola cuando termine la de tu rival.', accent: false };
}

/** /dashboard/tournaments/[id]: la llave en vivo. */
export function TournamentPage() {
  const { id } = useParams<{ id: string }>();
  const valid = TournamentParamsSchema.safeParse({ id }).success;
  const t = useTournament(valid ? id : null);
  const ticking = deadlinesOf(t.data).length > 0;
  const nowMs = useNow(t.skewMs, ticking || t.problem === 'offline');
  const minsAgo = t.loadedAt ? Math.max(1, Math.round((nowMs - t.skewMs - t.loadedAt) / 60_000)) : 1;
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const leave = async () => {
    setBusy(true); setAsk(false); setMsg(null);
    try { await tournamentsApi.leave(id); setMsg('Saliste del torneo.'); }
    catch (e) { setMsg(leaveError(e).text); }
    setBusy(false);
    t.refresh();
  };
  return <TournamentView data={t.data} problem={valid ? t.problem : 'not-found'} nowMs={nowMs} minsAgo={minsAgo} onRetry={t.refresh}
    leave={{ ask, busy, msg, onAsk: setAsk, onConfirm: () => void leave() }} />;
}

type LeaveUi = { ask: boolean; busy: boolean; msg: string | null; onAsk: (on: boolean) => void; onConfirm: () => void };

export function TournamentView({ data: d, problem, nowMs, minsAgo, onRetry, leave }: {
  data: TournamentDetail | null; problem: PollProblem | null; nowMs: number; minsAgo: number; onRetry: () => void; leave: LeaveUi;
}) {
  const back = (
    <Link href="/dashboard/tournaments" className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-medium text-ink-soft hover:text-ink">
      <span aria-hidden="true">‹</span> Torneos
    </Link>
  );
  const page = 'mx-auto flex max-w-[1376px] flex-col gap-5 px-4 pb-14 pt-6 sm:px-5 lg:px-8';

  if (!d) return (
    <div className={page}>
      {back}
      {problem === 'not-found' ? <h1 className="font-display text-[clamp(36px,5vw,52px)] font-semibold leading-none">Este torneo no existe.</h1>
        : problem ? (
          <div role="status" className="flex flex-wrap items-center gap-3">
            <p>{problem === 'offline' ? 'Sin conexión. Reintentamos solos.' : 'No se pudo cargar el torneo.'}</p>
            <Button variant="ghost" className="h-11!" onClick={onRetry}>Reintentar</Button>
          </div>
        ) : (
          <div aria-busy="true" aria-label="Cargando las llaves" className="flex flex-col gap-4">
            <Skeleton className="h-14 w-2/3 rounded-xl" /><Skeleton className="h-20 rounded-[14px]" /><Skeleton className="h-[420px] rounded-[14px]" />
          </div>
        )}
    </div>
  );

  const youId = youIdOf(d);
  const steps = stagesOf(d);
  const b = bannerOf(d, nowMs);
  const champion = d.status === 'finished' ? d.winner?.username ?? null : null;
  const roundIdx = d.status === 'finished' ? d.rounds.length - 1 : Math.max(0, d.rounds.findIndex(r => r.round === d.stage?.round));

  return (
    <div className={`${page} animate-rise`}>
      {back}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-display text-[clamp(36px,5vw,52px)] font-semibold leading-none">{d.name}</h1>
          <p className="font-mono text-[13px] text-ink-soft">
            {sameDay(d.startsAt, nowMs) ? 'Hoy' : day(d.startsAt)} · {tc(d.timeControl)} · con ELO · {d.players} jugadores · eliminación directa
          </p>
        </div>
        <ol aria-label="Etapas del torneo" className="flex flex-wrap gap-1.5">
          {steps.labels.map((l, i) => {
            const now = i === steps.current, done = i < steps.current;
            return (
              <li key={l} aria-current={now ? 'step' : undefined}
                className={`inline-flex min-h-8 items-center rounded-full px-3 font-mono text-xs font-medium ${now ? 'bg-ink text-paper' : done ? 'bg-band text-ink' : 'text-ink-soft'}`}>
                {done && <span aria-hidden="true" className="mr-1.5">✓</span>}{l}{done && <span className="sr-only"> (hecho)</span>}
              </li>
            );
          })}
        </ol>
      </div>

      {problem && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2 text-[15px] shadow-[inset_0_0_0_1px_var(--t-ink)]">
          <span>{problem === 'offline' ? `Sin conexión. Mostramos las llaves de hace ${minsAgo} min y reintentamos solos.` : 'No se pudo actualizar el torneo.'}</span>
          <Button variant="ghost" className="h-11!" onClick={onRetry}>Reintentar</Button>
        </div>
      )}

      {b && (
        <section aria-labelledby="aviso-torneo" className={`flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-[14px] px-5 py-4 ${b.accent ? 'bg-accent text-on-accent' : 'bg-band text-ink'}`}>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id="aviso-torneo" className="text-[17px] font-semibold">
              <span aria-live="polite">{b.title}</span>
              {b.clock && <> · <span className="font-mono nums">{b.clock}</span></>}
            </h2>
            <p className="text-[15px]">{b.text}</p>
            <p role="status" className="text-[15px] empty:hidden">{leave.msg}</p>
          </div>
          {b.cta && (
            <Link href={b.cta.href} className={`inline-flex min-h-12 items-center justify-center rounded-full px-[22px] font-semibold max-sm:w-full ${b.accent ? 'bg-on-accent text-accent' : 'bg-ink text-paper'}`}>{b.cta.label} ›</Link>
          )}
          {b.leave && (leave.ask ? (
            <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-2">
              <span className="text-[15px]">¿Salir del torneo? Liberas tu cupo.</span>
              <button type="button" onClick={leave.onConfirm} className="min-h-11 rounded-full bg-on-accent px-4 text-sm font-semibold text-accent">Sí, salir</button>
              <button type="button" autoFocus onClick={() => leave.onAsk(false)} className="min-h-11 px-1.5 text-sm font-medium underline underline-offset-4">No</button>
            </span>
          ) : (
            <button type="button" aria-disabled={leave.busy || undefined} onClick={() => { if (!leave.busy) leave.onAsk(true); }}
              className="min-h-12 rounded-full px-5 font-semibold shadow-[inset_0_0_0_1px_currentColor] max-sm:w-full">
              {leave.busy ? 'Saliendo…' : 'Salir del torneo'}
            </button>
          ))}
        </section>
      )}

      <ul aria-label="Reglas" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
        <li>Blancas: quien tiene mejor siembra.</li>
        <li>Tablas: pasa quien jugó con negras.</li>
        <li>Las blancas tienen {d.noshowS % 60 === 0 ? `${d.noshowS / 60} minutos` : `${d.noshowS} segundos`} para su primera jugada.</li>
      </ul>

      {d.rounds.length ? (<>
        <div className="hidden md:block"><BracketColumns rounds={d.rounds} youId={youId} nowMs={nowMs} champion={champion} /></div>
        <div className="md:hidden"><BracketTabs rounds={d.rounds} youId={youId} nowMs={nowMs} initial={roundIdx} /></div>
      </>) : <p className="text-ink-soft">Este torneo no tiene llaves.</p>}
      {champion && <p className="rounded-2xl bg-accent p-4 font-display text-[26px] font-semibold text-on-accent md:hidden">Campeón: {champion}</p>}
    </div>
  );
}
