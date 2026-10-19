import { Suspense, type ReactNode } from 'react';
import type { Metadata } from 'next';
import { HistoryHeader, MatchHistoryList } from '@/modules/arena/presentation/components/MatchHistoryList';

export const metadata: Metadata = { title: 'Partidas · Chess Predictor Pro' };

// La lista vive aquí para no volver a montarse al cambiar de partida. La repetición ocupa la columna derecha
// y pone su lista de jugadas bajo la lista de partidas (display: contents + posiciones de la rejilla).
export default function PartidasLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1240px] px-5 pb-16 pt-8 lg:px-10">
      <Suspense fallback={<div className="h-[160px]" />}><HistoryHeader /></Suspense>
      <div className="mt-10 grid items-start gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Suspense fallback={<p aria-busy="true" className="text-ink-soft">Cargando partidas…</p>}><MatchHistoryList /></Suspense>
        </div>
        {children}
      </div>
    </div>
  );
}
