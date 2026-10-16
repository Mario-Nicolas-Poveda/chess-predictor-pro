'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TIME_CONTROL_LABEL, type MatchmakingStatus } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { EloRangeBar } from './EloRangeBar';
import { TipRotator } from './TipRotator';

type Searching = Extract<MatchmakingStatus, { state: 'searching' }>;

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function Searching({ status, leaving, onCancel }: { status: Searching; leaving: boolean; onCancel: () => void }) {
  const tc = TIME_CONTROL_LABEL[status.timeControl];
  return (
    <div className="flex flex-col gap-5">
      <p className="eyebrow">{tc.label} · {tc.kind}</p>
      <h1 className="font-display text-[72px] font-semibold leading-none tracking-[-.02em]">Buscando rival…</h1>
      <Clock waited={status.waitedSeconds} />
      <EloRangeBar elo={status.elo} range={status.eloRange} />
      <TipRotator />
      <div>
        <Button variant="ghost" loading={leaving} onClick={onCancel}>Cancelar búsqueda</Button>
      </div>
    </div>
  );
}

// Parte de los segundos que da el servidor (sin depender del reloj del equipo); un solo intervalo por segundo.
function Clock({ waited }: { waited: number }) {
  const [secs, setSecs] = useState(waited);
  useEffect(() => {
    const t0 = Date.now() - waited * 1000;
    const id = setInterval(() => setSecs((Date.now() - t0) / 1000), 1000);
    return () => clearInterval(id);
  }, [waited]);
  return <p className="font-mono text-[40px] font-medium tracking-[-.02em] nums">{clock(secs)}</p>;
}
