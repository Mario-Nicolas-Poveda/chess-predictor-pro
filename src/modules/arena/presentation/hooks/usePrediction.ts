'use client';

import { useEffect, useRef, useState } from 'react';
import { aiApi } from '@/modules/ai-engine/presentation/api/aiApi';
import type { Prediction } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import type { GameState } from '@/modules/arena/infrastructure/dto/arenaSchemas';

/** Predicción de la posición (solo contra la IA), con ETag: si no cambió, 304 y nada. */
export function usePrediction(matchId: string, state: GameState | null, enabled: boolean) {
  const [data, setData] = useState<Prediction | null>(null);
  const [failed, setFailed] = useState(false);
  const etag = useRef<string | null>(null);
  const isAi = !!state?.ai, ply = state?.ply, status = state?.status;
  useEffect(() => {
    if (!enabled || !isAi || ply === undefined) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {                       // después de la animación de la última jugada
      try {
        const r = await aiApi.prediction(matchId, etag.current, ctrl.signal);
        if (r !== 'not-modified') { etag.current = r.etag; setData(r.prediction); }
        setFailed(false);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        console.warn('[prediction]', e);                     // 403, 429 o red: la partida sigue sin predicción
        setFailed(true);
      }
    }, 450);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [matchId, enabled, isAi, ply, status]);          // status: al terminar se pide una vez más (sin "top")
  // nunca una predicción de otra posición (latest solo para la barra, que así no salta mientras carga)
  return { prediction: data && state && data.ply === state.ply ? data : null, latest: data, failed };
}
