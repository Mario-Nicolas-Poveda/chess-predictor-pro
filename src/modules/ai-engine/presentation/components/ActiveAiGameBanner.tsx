'use client';

import Link from 'next/link';
import { Button, buttonClass } from '@/components/ui/Button';

/** Partida contra la IA sin terminar: seguirla, o rendirse y empezar la nueva. */
export function ActiveAiGameBanner({ matchId, busy, onResignAndStart }: { matchId: string; busy: boolean; onResignAndStart: () => void }) {
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-band px-5 py-4">
      <p className="font-medium">Tienes una partida contra la IA sin terminar.</p>
      <div className="flex flex-wrap gap-3">
        <Link href={`/dashboard/arena/${matchId}`} className={buttonClass('primary')}>Continuar</Link>
        <Button variant="ghost" loading={busy} onClick={onResignAndStart}>Rendirme y empezar otra</Button>
      </div>
    </div>
  );
}
