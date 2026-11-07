import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ArenaScreen } from '@/modules/arena/presentation/components/ArenaScreen';
import { loadInitialGameState } from '@/modules/arena/presentation/server/loadInitialGameState';

export const metadata: Metadata = { title: 'Partida · Chess Predictor Pro' };

type Params = Promise<{ matchId: string }>;

// El estado llega en el HTML (#171): el tablero 2D se pinta sin esperar a GET /state. Con los mocks, el cliente lo pide.
async function Arena({ params }: { params: Params }) {
  const { matchId } = await params;
  if (process.env.NEXT_PUBLIC_API_MOCK === '1') return <ArenaScreen matchId={matchId} />;
  const initial = await loadInitialGameState(matchId, `/dashboard/arena/${matchId}`);   // /login o 404 si toca
  return <ArenaScreen matchId={matchId} initial={initial} />;
}

// cookies() y params solo existen en la petición: con cacheComponents van dentro de un <Suspense>.
export default function ArenaPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p aria-busy="true" className="mx-auto max-w-[1200px] px-5 py-16 text-ink-soft lg:px-10">Cargando partida…</p>}>
      <Arena params={params} />
    </Suspense>
  );
}
