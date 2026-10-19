'use client';

import Link from 'next/link';
import { Button, buttonClass } from '@/components/ui/Button';
import type { RematchView } from '../hooks/useRematch';

/** Revancha: pedir · esperando (cancelar) · te la piden (aceptar / no, gracias) · aceptada (ir a la arena). */
export function RematchPanel({ view, rival, nextColor, busy, matchId, onRequest, onCancel }: {
  view: RematchView; rival: string; nextColor: string; busy: boolean; matchId: string; onRequest: () => void; onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p role="status" aria-live="polite" className="min-h-[22px] text-[15px] text-ink-soft">
        {view.kind === 'none' && view.notice && <span className="text-accent">{view.notice}</span>}
        {view.kind === 'waiting' && <>Esperando a {rival}<Dots /></>}
        {view.kind === 'offered' && <>{rival} quiere la revancha.</>}
        {view.kind === 'accepted' && <>{rival} aceptó. Ahora juegas con {nextColor}.</>}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {view.kind === 'none' && <>
          <Button loading={busy} onClick={onRequest}>Pedir revancha</Button>
          <Link href="/dashboard/play" className={buttonClass('ghost')}>Buscar otra partida</Link>
          <Link href={`/dashboard/partidas/${matchId}`} className="inline-flex h-12 items-center px-2 font-medium text-accent underline-offset-4 hover:underline">Ver la partida ›</Link>
        </>}
        {view.kind === 'waiting' && <Button variant="ghost" loading={busy} onClick={onCancel}>Cancelar</Button>}
        {view.kind === 'offered' && <>
          <Button loading={busy} onClick={onRequest}>Aceptar</Button>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>No, gracias</Button>
        </>}
        {view.kind === 'accepted' && <Link href={`/dashboard/arena/${view.matchId}`} className={buttonClass('primary')}>Ir a la arena ›</Link>}
      </div>
    </div>
  );
}

function Dots() {
  return (
    <span aria-hidden="true" className="ml-1 inline-flex gap-1">
      {[0, 1, 2].map(i => <span key={i} className="size-1.5 rounded-full bg-ink-soft motion-safe:animate-pulse" style={{ animationDelay: `${i * .2}s` }} />)}
    </span>
  );
}
