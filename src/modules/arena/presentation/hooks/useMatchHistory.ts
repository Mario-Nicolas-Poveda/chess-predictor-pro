'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/apiClient';
import type { MatchListItem } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { arenaApi } from '../api/arenaApi';

export type ResultFilter = 'win' | 'loss' | 'draw' | undefined;

/** Tus partidas (filtradas por resultado), de 20 en 20 con "Cargar más". */
export function useMatchHistory(result: ResultFilter) {
  const [items, setItems] = useState<MatchListItem[] | null>(null);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    arenaApi.history({ result }, ctrl.signal).then(r => { setItems(r.items); setNextBefore(r.nextBefore); setError(null); }, e => {
      if (ctrl.signal.aborted) return;
      setError(e instanceof ApiError ? e.message : 'No pudimos cargar tus partidas.');
    });
    return () => ctrl.abort();
  }, [result]);

  const loadMore = useCallback(async () => {
    if (!nextBefore) return;
    setLoadingMore(true);
    try {
      const r = await arenaApi.history({ result, before: nextBefore });
      setItems(prev => [...(prev ?? []), ...r.items]); setNextBefore(r.nextBefore);
    } catch { setError('No pudimos cargar más partidas.'); }
    finally { setLoadingMore(false); }
  }, [result, nextBefore]);

  return { items, nextBefore, error, loadingMore, loadMore };
}
