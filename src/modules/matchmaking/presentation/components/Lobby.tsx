'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TIME_CONTROLS, TIME_CONTROL_LABEL, type TimeControl } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { matchmakingApi } from '../api/matchmakingApi';

type Props = { busy: boolean; joining: boolean; error?: string; elo?: number; onJoin: (tc: TimeControl) => void };

export function Lobby({ busy, joining, error, elo, onJoin }: Props) {
  const [tc, setTc] = useState<TimeControl>('10+0');
  const [searching, setSearching] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    matchmakingApi.stats().then(s => { if (alive) setSearching(s.total); }).catch(() => {});   // si falla, la línea no se muestra
    return () => { alive = false; };
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <p className="eyebrow">Jugar</p>
      <h1 className="font-display text-[clamp(64px,7vw,96px)] font-semibold leading-[.98] tracking-[-.025em]">Encuentra rival.</h1>
      <p className="max-w-[440px] text-ink-soft">Elige el ritmo y te emparejamos con alguien de tu nivel.</p>

      {/* radios nativos: ← → cambian de ritmo sin código extra */}
      <fieldset className="mt-2.5">
        <legend className="sr-only">Ritmo de juego</legend>
        <div className="flex flex-wrap gap-2.5">
          {TIME_CONTROLS.map(id => (
            <label key={id} className="cursor-pointer">
              <input type="radio" name="tc" value={id} checked={tc === id} onChange={() => setTc(id)} className="peer sr-only" />
              <span className="flex min-w-32 flex-col items-center rounded-full px-[22px] py-3.5 leading-none shadow-[inset_0_0_0_1px_var(--t-muted)] transition-[background-color,color,box-shadow] duration-200 hover:shadow-[inset_0_0_0_1px_var(--t-ink)] peer-checked:bg-ink peer-checked:text-paper peer-checked:shadow-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-accent">
                <span className="font-display text-[28px] font-semibold">{TIME_CONTROL_LABEL[id].label}</span>
                <span className="mt-1.5 text-[13px] opacity-80">{TIME_CONTROL_LABEL[id].kind}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {searching !== null && (
        <p className="mt-1 flex items-center gap-2.5 text-caption text-ink-soft">
          <span aria-hidden="true" className="relative flex size-2">
            <span className="absolute inset-0 rounded-full bg-accent opacity-50 motion-safe:animate-ping" />
            <span className="relative size-2 rounded-full bg-accent" />
          </span>
          {searching} {searching === 1 ? 'jugador buscando' : 'jugadores buscando'} ahora
        </p>
      )}

      {error && <p role="alert" className="text-caption text-danger">{error}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-5">
        <Button className="h-14 px-10 text-lg" disabled={busy} loading={joining} onClick={() => onJoin(tc)}>
          {joining ? 'Buscando…' : 'Buscar partida'}
        </Button>
        {elo !== undefined && <span className="font-mono text-xs text-ink-faint nums">rivales entre {elo - 100} y {elo + 100}</span>}
      </div>
    </div>
  );
}
