'use client';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { BracketGame, BracketRound, BracketSide } from '@/modules/tournaments/infrastructure/dto/tournamentSchemas';
import { gameLabel, gameStatus } from '../lib/bracketText';

/**
 * La llave. Escritorio: una columna por ronda con conectores (vista "Torneo · llaves").
 * Celular: pestañas por ronda, sin desplazamiento lateral (vista "Móvil"). Cada ronda es una lista
 * (<ol>) y cada partida un <li> con su aria-label: se lee bien con lector de pantalla.
 */
interface Props { rounds: BracketRound[]; youId: string | null; nowMs: number; champion?: string | null }

function Side({ s, youId }: { s: BracketSide; youId: string | null }) {
  const you = !!s.player && s.player.id === youId;
  const lost = !!s.score && !s.advanced && s.score !== '½';
  return (
    <div className="flex min-h-11 items-center gap-2.5 border-b border-rule px-3">
      <span aria-hidden="true" className="size-3 flex-none rounded-full"
            style={{ background: s.color === 'white' ? '#fbf8f1' : s.color === 'black' ? '#2a1417' : 'transparent',
                     boxShadow: `inset 0 0 0 1px ${s.color ? 'var(--t-faint)' : 'var(--t-rule)'}` }} />
      <span className="w-[18px] flex-none font-mono text-[12px] text-ink-soft">{s.player?.seed ?? ''}</span>
      <span className={`min-w-0 flex-1 truncate text-[15px] ${s.player ? '' : 'italic text-ink-soft'} ${s.advanced ? 'font-bold' : 'font-medium'} ${lost ? 'text-ink-soft' : ''}`}>
        {s.player?.username ?? 'Por definir'}
      </span>
      {you && <span className="rounded-full bg-accent px-2 font-mono text-[11px] font-semibold text-on-accent">Tú</span>}
      <span className={`min-w-[22px] text-right font-mono text-[14px] font-semibold ${lost ? 'text-ink-soft' : ''}`}>{s.score ?? ''}</span>
    </div>
  );
}

export function GameCard({ g, youId, nowMs }: { g: BracketGame; youId: string | null; nowMs: number }) {
  const mine = !!youId && (g.top.player?.id === youId || g.bottom.player?.id === youId);
  const live = g.state === 'playing' || g.state === 'ready';
  return (
    <div className={`w-full overflow-hidden rounded-xl border bg-vellum ${g.state === 'preview' ? 'border-dashed' : ''} border-rule`}
         style={mine ? { boxShadow: '0 0 0 2px var(--t-acc)' } : undefined}>
      <Side s={g.top} youId={youId} />
      {g.bye
        ? <div className="flex min-h-11 items-center border-b border-rule px-3 text-[15px] italic text-ink-soft">Libre</div>
        : <Side s={g.bottom} youId={youId} />}
      <div className="flex min-h-[30px] items-center gap-2 px-3 font-mono text-[12px] text-ink-soft">
        {live && <span aria-hidden="true" className="size-2 rounded-full bg-accent motion-safe:animate-pulse" />}
        <span>{gameStatus(g, nowMs)}</span>
      </div>
    </div>
  );
}

/** Escritorio: columnas con conectores. Las partidas de cada ronda reparten la altura: los centros cuadran. */
export function BracketColumns({ rounds, youId, nowMs, champion }: Props) {
  const last = rounds.length - 1;
  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid min-w-[1100px] gap-x-8" style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(250px, 1fr)) minmax(200px, .8fr)` }}>
        {rounds.map((r, ri) => (
          <section key={r.round} aria-labelledby={`ronda-${r.round}`} className="flex flex-col gap-2.5">
            <h2 id={`ronda-${r.round}`} className="m-0 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">{r.name}</h2>
            <ol className="m-0 flex min-h-[520px] list-none flex-col p-0">
              {r.games.map((g, i) => (
                <li key={g.slot} aria-label={gameLabel(g, r.name, nowMs)} className="relative flex flex-1 items-center py-1.5">
                  {ri > 0 && <span aria-hidden="true" className="absolute -left-4 top-1/2 w-4 border-t border-ink-faint" />}
                  <span aria-hidden="true" className="absolute -right-[17px] w-4 border-ink-faint"
                        style={ri === last ? { top: '50%', borderTopWidth: 1 }
                          : i % 2 === 0 ? { top: '50%', bottom: 0, borderTopWidth: 1, borderRightWidth: 1 }
                          : { top: 0, bottom: '50%', borderBottomWidth: 1, borderRightWidth: 1 }} />
                  <GameCard g={g} youId={youId} nowMs={nowMs} />
                </li>
              ))}
            </ol>
          </section>
        ))}
        <section aria-labelledby="campeon" className="flex flex-col gap-2.5">
          <h2 id="campeon" className="m-0 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">Campeón</h2>
          <div className="relative flex min-h-[520px] items-center">
            <span aria-hidden="true" className="absolute -left-4 top-1/2 w-4 border-t border-ink-faint" />
            <p className={`m-0 w-full rounded-2xl p-4 font-display text-[30px] ${champion ? 'bg-accent text-on-accent' : 'bg-band text-ink-soft'}`}>
              {champion ?? 'Por definir'}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Flechas (con vuelta), Inicio y Fin; otra tecla → null. */
export const nextTab = (key: string, sel: number, n: number): number | null =>
  ({ ArrowRight: (sel + 1) % n, ArrowLeft: (sel + n - 1) % n, Home: 0, End: n - 1 } as Record<string, number>)[key] ?? null;

/** Celular: pestañas por ronda (flechas, Inicio y Fin) y la lista de esa ronda. */
export function BracketTabs({ rounds, youId, nowMs, initial }: Props & { initial?: number }) {
  const [sel, setSel] = useState(Math.min(initial ?? 0, rounds.length - 1));
  const base = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const pick = (i: number, focus: boolean) => { setSel(i); if (focus) tabs.current[i]?.focus(); };
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const next = nextTab(e.key, sel, rounds.length);
    if (next === null) return;
    e.preventDefault(); pick(next, true);
  }
  const r = rounds[sel];
  if (!r) return null;
  return (
    <div>
      <div role="tablist" aria-label="Rondas" onKeyDown={onKey} className="flex gap-1 border-b border-rule">
        {rounds.map((x, i) => (
          <button key={x.round} ref={el => { tabs.current[i] = el; }} type="button" role="tab" id={`${base}-t${i}`}
                  aria-selected={i === sel} aria-controls={`${base}-p`} tabIndex={i === sel ? 0 : -1} onClick={() => pick(i, false)}
                  className={`min-h-11 flex-1 text-[15px] font-semibold ${i === sel ? 'text-ink shadow-[inset_0_-3px_0_var(--t-acc)]' : 'text-ink-soft'}`}>
            {x.name === 'Semifinal' ? 'Semis' : x.name}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${base}-p`} aria-labelledby={`${base}-t${sel}`} tabIndex={0} className="pt-3.5">
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          {r.games.map(g => <li key={g.slot} aria-label={gameLabel(g, r.name, nowMs)}><GameCard g={g} youId={youId} nowMs={nowMs} /></li>)}
        </ol>
      </div>
    </div>
  );
}
