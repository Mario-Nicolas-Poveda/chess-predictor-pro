import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResultScreen } from '@/modules/arena/presentation/components/ResultScreen';

export const metadata: Metadata = { title: 'Resultado · Chess Predictor Pro' };

// El id solo se conoce en la petición: con cacheComponents, useParams necesita un <Suspense> encima.
export default function ResultPage() {
  return (
    <Suspense fallback={<p aria-busy="true" className="mx-auto max-w-[1240px] px-5 py-16 text-ink-soft lg:px-10">Cargando resultado…</p>}>
      <ResultScreen />
    </Suspense>
  );
}
