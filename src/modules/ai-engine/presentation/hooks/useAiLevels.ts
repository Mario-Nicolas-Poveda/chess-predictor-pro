'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/apiClient';
import type { AiLevelsResponse } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import { aiApi } from '../api/aiApi';

export const AI_LOGIN = `/login?next=${encodeURIComponent('/dashboard/ai')}`;

/** Niveles, el recomendado según tu ELO y la partida contra la IA sin terminar (si hay). */
export function useAiLevels() {
  const router = useRouter();
  const [data, setData] = useState<AiLevelsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    aiApi.levels().then(d => { if (alive) setData(d); }, e => {
      if (!alive) return;
      if (e instanceof ApiError && e.status === 401) router.replace(AI_LOGIN);
      else setError('No se pudieron cargar los niveles. Recarga la página.');
    });
    return () => { alive = false; };
  }, [router]);
  return { data, error };
}
