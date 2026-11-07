import { Suspense } from 'react';
import { ReplayPlayer } from '@/modules/arena/presentation/components/ReplayPlayer';
import { loadInitialGameState } from '@/modules/arena/presentation/server/loadInitialGameState';

type Params = Promise<{ matchId: string }>;

// La partida llega en el HTML (#171): el tablero 2D se pinta sin esperar a GET /state. Con los mocks, el cliente la pide.
async function Replay({ params }: { params: Params }) {
  const { matchId } = await params;
  if (process.env.NEXT_PUBLIC_API_MOCK === '1') return <ReplayPlayer key={matchId} matchId={matchId} />;
  const { state } = await loadInitialGameState(matchId, `/dashboard/partidas/${matchId}`);   // /login o 404 si toca
  return <ReplayPlayer key={matchId} matchId={matchId} initial={state} />;
}

// cookies() y params solo existen en la petición: con cacheComponents van dentro de un <Suspense>.
export default function ReplayPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p aria-busy="true" className="text-ink-soft lg:col-start-2 lg:row-start-1">Cargando partida…</p>}>
      <Replay params={params} />
    </Suspense>
  );
}
