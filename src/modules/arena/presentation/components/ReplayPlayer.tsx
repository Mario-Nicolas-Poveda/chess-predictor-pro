'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { sanEs } from '@/components/chess/san';
import type { BoardView } from '@/components/three/scenes/gameBoardScene';
import type { GameState } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { moveLabel as reviewMoveLabel } from '@/modules/coach/domain/notation';
import { MoveClassMark } from '@/modules/coach/presentation/components/MoveClassMark';
import { ReviewSkeleton } from '@/modules/coach/presentation/components/ReviewState';
import { useReview } from '@/modules/coach/presentation/hooks/useCoachJobs';
import { moveNumberLabel } from '@/modules/coach/presentation/lib/evalGraph';
import { MOVE_CLASS_UI, momentArrows } from '@/modules/coach/presentation/lib/moveClass';
import { usePreferences } from '@/modules/dashboard/presentation/preferences/PreferencesProvider';
import { THEME_3D, accentHex } from '@/modules/dashboard/presentation/theme/themes';
import { TIME_CONTROL_LABEL } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { useReplay } from '../hooks/useReplay';
import { OUTCOME_TITLE, REASON_SHORT, dayLabel, outcomeOf } from '../reasons';
import { BoardModeToggle } from './BoardModeToggle';
import { BoardStage } from './BoardStage';
import { MoveList } from './MoveList';
import { PlayerStrip, materialOf } from './PlayerStrip';

// se carga al abrir la pestaña: la repetición no sube de peso (#85)
const ReviewPanel = dynamic(() => import('@/modules/coach/presentation/components/ReviewPanel').then(m => m.ReviewPanel), { ssr: false, loading: () => <ReviewSkeleton /> });

const TABS = [['jugadas', 'Jugadas'], ['analisis', 'Análisis']] as const;
type Tab = (typeof TABS)[number][0];

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0');
const noop = () => {};
const moveLabel = (ply: number, san: string | undefined) =>
  !san ? 'Inicio' : `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'} ${sanEs(san)}`;

/** /dashboard/partidas/[id]: la partida jugada a jugada (las piezas en la columna izquierda del layout van bajo la lista). */
export function ReplayPlayer() {
  const { matchId } = useParams<{ matchId: string }>();
  const r = useReplay(matchId);
  const s = r.state;

  if (r.error) return <p role="alert" className="text-ink-soft lg:col-start-2 lg:row-start-1">{r.error}</p>;
  if (!s) return <p aria-busy="true" className="text-ink-soft lg:col-start-2 lg:row-start-1">Cargando partida…</p>;
  if (s.status !== 'finished' || !s.result) return (
    <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
      <p className="font-display text-[32px] font-semibold">Esta partida sigue en juego.</p>
      <Link href={`/dashboard/arena/${s.id}`} className="text-accent underline-offset-4 hover:underline">Ir a la arena ›</Link>
    </div>
  );
  return <FinishedReplay key={s.id} r={r} s={s} result={s.result} />;
}

function FinishedReplay({ r, s, result }: { r: ReturnType<typeof useReplay>; s: GameState; result: NonNullable<GameState['result']> }) {
  const router = useRouter();
  const { prefs } = usePreferences();
  const [now] = useState(() => Date.now());
  const review = useReview(s.id);
  const analysis = review.view.kind === 'ready' ? review.view.data.analysis : null;
  const [moment, setMoment] = useState<number | null>(null);        // la jugada de la que se ven las flechas
  const board = useRef<HTMLElement>(null);
  const tab: Tab = useSearchParams().get('tab') === 'analisis' ? 'analisis' : 'jugadas';

  useEffect(() => {
    if (review.view.kind === 'unavailable' && review.view.code === 'UNAUTHORIZED') router.replace(`/login?next=${encodeURIComponent(`/dashboard/partidas/${s.id}`)}`);
  }, [review.view, router, s.id]);

  // replaceState y no router.replace: cambiar de pestaña no va al servidor ni ensucia el historial
  const pickTab = (t: Tab, focus = false) => {
    const url = new URL(window.location.href);
    if (t === 'analisis') url.searchParams.set('tab', t); else url.searchParams.delete('tab');
    window.history.replaceState(null, '', url);
    if (focus) document.getElementById(`tab-${t}`)?.focus();
  };
  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    pickTab(tab === 'jugadas' ? 'analisis' : 'jugadas', true);
  };

  const go = (p: number) => { setMoment(null); r.go(p); };
  const toggle = () => { setMoment(null); r.toggle(); };
  const showMoment = (p: number, again: boolean) => {
    if (again && moment === p) return setMoment(null);
    r.go(p - 1); setMoment(p);
    // en el celular el tablero queda arriba del panel: sin esto, las flechas no se verían
    if (!window.matchMedia('(min-width: 1024px)').matches) board.current?.scrollIntoView();
  };
  const mom = moment !== null ? analysis?.moves[moment - 1] : undefined;

  const you = s.yourColor, rivalColor = you === 'white' ? 'black' : 'white';
  const outcome = outcomeOf(result.winner, you);
  const frame = r.frames[r.ply]!;
  const sans = s.moves.map(m => m.san);
  const atEnd = r.ply === r.last;
  const delta = result.elo[you].after - result.elo[you].before;
  const t = TIME_CONTROL_LABEL[s.timeControl];
  const shownMove = analysis?.moves[r.ply - 1];
  const current = moveLabel(r.ply, sans[r.ply - 1]) + (shownMove ? MOVE_CLASS_UI[shownMove.class].symbol : '');

  const view: BoardView = {
    pieces: frame.pieces, captured: frame.captured, selected: null, targets: [], captures: [], movable: [],
    lastMove: frame.lastMove, check: atEnd ? null : frame.check, orientation: you, interactive: false, ended: atEnd,
    // el rey que perdió cae solo en la última jugada; al volver atrás se levanta
    toppled: atEnd && result.winner ? (result.winner === 'white' ? 'black' : 'white') : null,
    colors: { ...THEME_3D[prefs.theme], accent: accentHex(prefs.theme, prefs.accent) },
    arrows: mom ? momentArrows(mom) : [],
  };
  const strip = (c: 'white' | 'black') => {
    const p = c === you ? s.you : s.opponent, mine = c === 'white' ? frame.captured.black : frame.captured.white;
    const theirs = c === 'white' ? frame.captured.white : frame.captured.black;
    return { name: p.username, avatarUrl: p.avatarUrl, elo: result.elo[c].before, color: c, you: c === you, captured: mine, advantage: materialOf(mine) - materialOf(theirs) };
  };
  const btn = 'grid size-11 place-items-center rounded-full text-ink hover:bg-band disabled:opacity-40';

  return (
    <div className="contents">
      {/* sticky: el tablero sigue a la vista mientras se lee el análisis, más largo que él */}
      <section ref={board} aria-labelledby="replay-title" className="flex min-w-0 scroll-mt-4 flex-col gap-3 lg:sticky lg:top-[-8px] lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="replay-title" className="font-display text-[clamp(32px,3.4vw,44px)] font-semibold leading-tight">{s.you.username} contra {s.opponent.username}</h2>
          <p className="font-mono text-xs text-ink-faint">{t.label} · {s.endedAt ? dayLabel(s.endedAt, now) : ''} · {OUTCOME_TITLE[outcome].slice(0, -1).toLowerCase()}</p>
        </div>
        {/* la jugada actual va en su fila, no encima del tablero (en el celular tapaba las piezas) */}
        <div className="flex min-h-11 items-center justify-between gap-3">
          <p aria-live="polite" className="m-0 flex min-w-0 items-baseline gap-2">
            <span className="font-display text-[26px] italic leading-none">{current}</span>
            <span className="font-mono text-[11px] text-ink-faint">{r.ply ? `jugada ${r.ply} de ${r.last}` : 'posición inicial'}</span>
          </p>
          <BoardModeToggle />
        </div>
        <PlayerStrip {...strip(rivalColor)} />
        <BoardStage view={view} onSquare={noop} label="" />
        <PlayerStrip {...strip(you)} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button type="button" aria-label="Posición inicial" className={btn} disabled={r.ply === 0} onClick={() => go(0)}><ChevronFirst size={22} aria-hidden="true" /></button>
          <button type="button" aria-label="Jugada anterior" className={btn} disabled={r.ply === 0} onClick={() => go(r.ply - 1)}><ChevronLeft size={22} aria-hidden="true" /></button>
          <button type="button" aria-label={r.playing ? 'Pausar' : 'Reproducir'} onClick={toggle}
            className="grid size-[52px] place-items-center rounded-full bg-accent text-on-accent hover:brightness-95">
            {r.playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" className="translate-x-px" />}
          </button>
          <button type="button" aria-label="Jugada siguiente" className={btn} disabled={atEnd} onClick={() => go(r.ply + 1)}><ChevronRight size={22} aria-hidden="true" /></button>
          <button type="button" aria-label="Última jugada" className={btn} disabled={atEnd} onClick={() => go(r.last)}><ChevronLast size={22} aria-hidden="true" /></button>
          <input type="range" min={0} max={r.last} value={r.ply} onChange={e => go(Number(e.target.value))} aria-label="Jugada"
            aria-valuetext={r.ply ? `Jugada ${r.ply} de ${r.last}: ${sanEs(sans[r.ply - 1]!)}` : `Posición inicial, ${r.last} jugadas`}
            className="h-11 min-w-[140px] flex-auto accent-[var(--t-acc)]" />
          <span className="font-mono text-sm text-ink-soft nums">{r.ply} / {r.last}</span>
        </div>
        {mom && (
          <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs text-ink-soft">
            <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-1.5 w-6 rounded-sm bg-ink-soft opacity-70" />Jugaste {reviewMoveLabel(mom)}</span>
            {mom.best && <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-1.5 w-6 rounded-sm bg-accent" />Mejor {moveNumberLabel(mom.ply, sanEs(mom.best.san))}</span>}
          </div>
        )}
      </section>

      <div className="flex min-w-0 flex-col gap-2.5 lg:col-start-1 lg:row-start-2">
        <div role="tablist" aria-label="Panel de la partida" onKeyDown={onTabKey} className="flex gap-1 border-b border-rule">
          {TABS.map(([id, name]) => (
            <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} tabIndex={tab === id ? 0 : -1} onClick={() => pickTab(id)}
              className={`min-h-11 px-4 font-mono text-[13px] font-semibold tracking-[.04em] ${tab === id ? 'text-ink shadow-[inset_0_-2px_0_var(--t-ink)]' : 'text-ink-soft'}`}>{name}</button>
          ))}
        </div>
        <div role="tabpanel" id="panel-jugadas" aria-labelledby="tab-jugadas" hidden={tab !== 'jugadas'} className="flex flex-col gap-2.5">
          <MoveList sans={sans} current={r.ply} onPick={go} mark={analysis ? p => analysis.moves[p - 1] && <MoveClassMark cls={analysis.moves[p - 1]!.class} /> : undefined} />
          <p className="text-ink-soft">{OUTCOME_TITLE[outcome].slice(0, -1)} por {REASON_SHORT[result.reason]} · {signed(delta)} de ELO · {r.last} {r.last === 1 ? 'media jugada' : 'medias jugadas'}.</p>
        </div>
        <div role="tabpanel" id="panel-analisis" aria-labelledby="tab-analisis" hidden={tab !== 'analisis'}>
          {tab === 'analisis' && <ReviewPanel view={review.view} onRequest={() => void review.request()} onReanalyze={() => void review.reanalyze()}
            ply={r.ply} onPly={go} moment={mom ? moment : null} onMoment={showMoment} />}
        </div>
      </div>
    </div>
  );
}
