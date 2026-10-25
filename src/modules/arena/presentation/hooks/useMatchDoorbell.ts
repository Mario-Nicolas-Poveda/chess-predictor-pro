'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { realtimeClient } from '@/lib/realtime';

/** true mientras el canal match:<id> está conectado. `onRing` se llama con cada aviso del servidor ({ v, ply, status }). */
export function useMatchDoorbell(matchId: string | null, onRing: () => void): boolean {
  const [live, setLive] = useState(false);
  const ring = useEffectEvent(onRing);                       // siempre la versión más nueva, sin re-suscribir
  useEffect(() => {
    const p = matchId ? realtimeClient() : null;
    if (!p) return;
    let alive = true;
    let channel: RealtimeChannel | null = null;
    void p.then(sb => {
      if (!alive) return;
      channel = sb.channel(`match:${matchId}`)
        .on('broadcast', { event: 'state' }, () => ring())
        .subscribe(status => { if (alive) setLive(status === 'SUBSCRIBED'); });
    });
    return () => {
      alive = false;
      setLive(false);
      if (channel) { const ch = channel; void p.then(sb => sb.removeChannel(ch)); }
    };
  }, [matchId]);
  return live;
}
