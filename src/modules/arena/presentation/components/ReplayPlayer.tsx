'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { sanEs } from '@/components/chess/san';
import type { BoardView } from '@/components/three/scenes/gameBoardScene';
import { usePreferences } from '@/modules/dashboard/presentation/preferences/PreferencesProvider';
import { THEME_3D, accentHex } from '@/modules/dashboard/presentation/theme/themes';
import { TIME_CONTROL_LABEL } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { useReplay } from '../hooks/useReplay';
import { OUTCOME_TITLE, REASON_SHORT, dayLabel, outcomeOf } from '../reasons';
import { GameBoard3D } from './GameBoard3D';
import { MoveList } from './MoveList';
import { PlayerStrip, materialOf } from './PlayerStrip';

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0');
const noop = () => {};
const moveLabel = (ply: number, san: string | undefined) =>
  !san ? 'Inicio' : `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'} ${sanEs(san)}`;

/** /dashboard/partidas/[id]: la partida jugada a jugada (las piezas en la columna izquierda del layout van bajo la lista). */
export function ReplayPlayer() {
  const { matchId } = useParams<{ matchId: string }>();
  const r = useReplay(matchId);
  const { prefs } = usePreferences();
  const [now] = useState(() => Date.now());
  const s = r.state;

  if (r.error) return <p role="alert" className="text-ink-soft lg:col-start-2 lg:row-start-1">{r.error}</p>;
  if (!s) return <p aria-busy="true" className="text-ink-soft lg:col-start-2 lg:row-start-1">Cargando partida…</p>;
  if (s.status !== 'finished' || !s.result) return (
    <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
      <p className="font-display text-[32px] font-semibold">Esta partida sigue en juego.</p>
      <Link href={`/dashboard/arena/${s.id}`} className="text-accent underline-offset-4 hover:underline">Ir a la arena ›</Link>
    </div>
  );

  const you = s.yourColor, rivalColor = you === 'white' ? 'black' : 'white';
  const outcome = outcomeOf(s.result.winner, you);
  const frame = r.frames[r.ply]!;
  const sans = s.moves.map(m => m.san);
  const atEnd = r.ply === r.last;
  const delta = s.result.elo[you].after - s.result.elo[you].before;
  const t = TIME_CONTROL_LABEL[s.timeControl];
  const current = moveLabel(r.ply, sans[r.ply - 1]);

  const view: BoardView = {
    pieces: frame.pieces, captured: frame.captured, selected: null, targets: [], captures: [], movable: [],
    lastMove: frame.lastMove, check: atEnd ? null : frame.check, orientation: you, interactive: false, ended: atEnd,
    // el rey que perdió cae solo en la última jugada; al volver atrás se levanta
    toppled: atEnd && s.result.winner ? (s.result.winner === 'white' ? 'black' : 'white') : null,
    colors: { ...THEME_3D[prefs.theme], accent: accentHex(prefs.theme, prefs.accent) },
  };
  const strip = (c: 'white' | 'black') => {
    const p = c === you ? s.you : s.opponent, mine = c === 'white' ? frame.captured.black : frame.captured.white;
    const theirs = c === 'white' ? frame.captured.white : frame.captured.black;
    return { name: p.username, elo: s.result!.elo[c].before, color: c, you: c === you, captured: mine, advantage: materialOf(mine) - materialOf(theirs) };
  };
  const btn = 'grid size-11 place-items-center rounded-full text-ink hover:bg-band disabled:opacity-40';

  return (
    <div className="contents">
      <section aria-labelledby="replay-title" className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
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
        </div>
        <PlayerStrip {...strip(rivalColor)} />
        <GameBoard3D view={view} onSquare={noop} label="" />
        <PlayerStrip {...strip(you)} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button type="button" aria-label="Posición inicial" className={btn} disabled={r.ply === 0} onClick={() => r.go(0)}><ChevronFirst size={22} aria-hidden="true" /></button>
          <button type="button" aria-label="Jugada anterior" className={btn} disabled={r.ply === 0} onClick={() => r.go(r.ply - 1)}><ChevronLeft size={22} aria-hidden="true" /></button>
          <button type="button" aria-label={r.playing ? 'Pausar' : 'Reproducir'} onClick={r.toggle}
            className="grid size-[52px] place-items-center rounded-full bg-accent text-on-accent hover:brightness-95">
            {r.playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" className="translate-x-px" />}
          </button>
          <button type="button" aria-label="Jugada siguiente" className={btn} disabled={atEnd} onClick={() => r.go(r.ply + 1)}><ChevronRight size={22} aria-hidden="true" /></button>
          <button type="button" aria-label="Última jugada" className={btn} disabled={atEnd} onClick={() => r.go(r.last)}><ChevronLast size={22} aria-hidden="true" /></button>
          <input type="range" min={0} max={r.last} value={r.ply} onChange={e => r.go(Number(e.target.value))} aria-label="Jugada"
            aria-valuetext={r.ply ? `Jugada ${r.ply} de ${r.last}: ${sanEs(sans[r.ply - 1]!)}` : `Posición inicial, ${r.last} jugadas`}
            className="h-11 min-w-[140px] flex-auto accent-[var(--t-acc)]" />
          <span className="font-mono text-sm text-ink-soft nums">{r.ply} / {r.last}</span>
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-2.5 lg:col-start-1 lg:row-start-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-[11px] font-normal uppercase tracking-[.14em] text-ink-faint">Jugadas</h2>
          <span className="font-mono text-xs text-ink-faint">{r.last} {r.last === 1 ? 'media jugada' : 'medias jugadas'}</span>
        </div>
        <MoveList sans={sans} current={r.ply} onPick={r.go} />
        <p className="text-ink-soft">{OUTCOME_TITLE[outcome].slice(0, -1)} por {REASON_SHORT[s.result.reason]} · {signed(delta)} de ELO.</p>
      </div>
    </div>
  );
}
