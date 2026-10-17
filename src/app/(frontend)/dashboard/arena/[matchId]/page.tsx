import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ArenaScreen } from '@/modules/matchmaking/presentation/components/ArenaScreen';

export const metadata: Metadata = { title: 'Partida · Chess Predictor Pro' };

// El id solo se conoce en la petición: con cacheComponents, useParams necesita un <Suspense> encima.
export default function ArenaPage() {
  return (
    <Suspense fallback={<p aria-busy="true" className="mx-auto max-w-[1200px] px-5 py-16 text-ink-soft lg:px-10">Cargando partida…</p>}>
      <ArenaScreen />
    </Suspense>
  );
}
