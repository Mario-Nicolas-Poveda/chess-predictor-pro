import { Suspense } from 'react';
import { ReplayPlayer } from '@/modules/arena/presentation/components/ReplayPlayer';

// El id solo se conoce en la petición: con cacheComponents, useParams necesita un <Suspense> encima.
export default function ReplayPage() {
  return (
    <Suspense fallback={<p aria-busy="true" className="text-ink-soft lg:col-start-2 lg:row-start-1">Cargando partida…</p>}>
      <ReplayPlayer />
    </Suspense>
  );
}
