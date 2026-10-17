'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/apiClient';
import type { MatchSummary } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { matchmakingApi } from '../api/matchmakingApi';
import { PlayLayout, PlayStage } from './PlayStage';

type View = { kind: 'loading' } | { kind: 'match'; match: MatchSummary } | { kind: 'error'; message: string };

const ERRORS: Record<number, string> = {
  400: 'El enlace de la partida no es válido.',
  403: 'No participas en esta partida.',
  404: 'Esta partida no existe.',
};

// Página provisional de la partida: la arena llega en el Sprint 3.
export function ArenaScreen() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [leaving, setLeaving] = useState(false);

  // Carga y revisa cada 5 s mientras está pendiente, por si el rival abandona
  useEffect(() => {
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (document.hidden) { timer = setTimeout(tick, 1000); return; }
      try {
        const { match } = await matchmakingApi.match(matchId, ctrl.signal);
        setView({ kind: 'match', match });
        if (match.status === 'pending') timer = setTimeout(tick, 5000);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        if (e instanceof ApiError && e.status === 401) { router.replace(`/login?next=${encodeURIComponent(location.pathname)}`); return; }
        const message = e instanceof ApiError ? ERRORS[e.status] : undefined;
        if (message) setView({ kind: 'error', message });
        else timer = setTimeout(tick, 5000);   // red o 500: reintenta sin borrar lo que ya se ve
      }
    };
    void tick();
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [matchId, router]);

  const abandon = async (id: string) => {
    setLeaving(true);
    try { await matchmakingApi.abort(id); } catch { /* 404/409: igual vuelve a Jugar */ }
    router.push('/dashboard/play');
  };

  return (
    <PlayLayout stage={<PlayStage phase="arena" />}>
      {view.kind === 'loading' && <p aria-busy="true" className="text-ink-soft">Cargando partida…</p>}
      {view.kind === 'error' && (
        <div className="flex flex-col gap-5">
          <h1 className="font-display text-heading font-semibold">{view.message}</h1>
          <Link href="/dashboard/play" className="text-accent underline-offset-4 hover:underline">Ir a Jugar ›</Link>
        </div>
      )}
      {view.kind === 'match' && (view.match.status === 'aborted' ? (
        <div className="flex flex-col gap-5">
          <h1 className="font-display text-[64px] font-semibold leading-none">Tu rival abandonó la partida.</h1>
          <div><Button onClick={() => router.push('/dashboard/play')}>Buscar otra</Button></div>
        </div>
      ) : (
        <div className="flex flex-col gap-[18px]">
          <p className="eyebrow">Partida {view.match.id.slice(0, 4)} · {view.match.you.username} vs {view.match.opponent.username}</p>
          <h1 className="font-display text-[64px] font-semibold leading-none">La arena llega en el Sprint 3.</h1>
          <p className="max-w-[440px] text-ink-soft">La partida quedó creada y ambos jugadores la ven.</p>
          {view.match.status === 'pending' && (
            <div><Button variant="ghost" loading={leaving} onClick={() => abandon(view.match.id)}>Abandonar y volver</Button></div>
          )}
        </div>
      ))}
    </PlayLayout>
  );
}
