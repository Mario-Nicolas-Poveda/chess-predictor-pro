import { Suspense } from 'react';
import type { Metadata } from 'next';
import { TournamentPage } from '@/modules/tournaments/presentation/components/TournamentPage';

export const metadata: Metadata = { title: 'Llaves · Chess Predictor Pro' };

// El id solo se conoce en la petición: con cacheComponents, useParams necesita un <Suspense> encima.
export default function Page() {
  return (
    <Suspense fallback={<p aria-busy="true" className="mx-auto max-w-[1376px] px-5 py-16 text-ink-soft lg:px-8">Cargando las llaves…</p>}>
      <TournamentPage />
    </Suspense>
  );
}
