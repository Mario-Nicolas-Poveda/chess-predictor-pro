'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/apiClient';
import type { RankingPage } from '@/modules/ranking/infrastructure/dto/rankingSchemas';
import { getRanking, type RankingParams } from '../api/rankingApi';

export const PAGE_SIZE = 10;
export type Sort = RankingParams['sort'];
export type Busy = 'replace' | 'more' | null;
export type Problem = 'offline' | 'error' | null;
type Mode = 'replace' | 'more' | 'refresh';

/**
 * El ranking que manda el servidor. Orden o búsqueda → reemplaza (y cancela la anterior); "Mostrar más" → agrega;
 * al volver a la pestaña o al foco, la primera página con su ETag (304 casi siempre). Sin consulta periódica.
 */
export function useRanking() {
  const [sort, setSort] = useState<Sort>('elo');
  const [q, setQ] = useState('');            // lo que se escribe
  const [query, setQuery] = useState('');    // lo que se pide, 300 ms después
  const [data, setData] = useState<RankingPage | null>(null);
  const [more_, setMore] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  const [retries, setRetries] = useState(0);
  const ctrl = useRef<AbortController | null>(null);
  const etag = useRef<string | null>(null);

  const fetchPage = useCallback((p: RankingParams, mode: Mode) => {
    if (mode === 'refresh' && ctrl.current) return;      // ya hay una en vuelo: esa basta
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    getRanking(p, mode === 'refresh' ? etag.current : null, c.signal).then(r => {
      if (c.signal.aborted) return;
      setProblem(null);
      if (r.kind === 'not-modified') return;
      if (p.offset === 0) etag.current = r.etag;
      // shortcut: un refresh con datos nuevos vuelve a la primera página (se pierden las filas de "Mostrar más"); cambia solo al terminar una partida con ELO
      setData(prev => (mode === 'more' && prev ? { ...r.data, items: [...prev.items, ...r.data.items] } : r.data));
    }, (e: unknown) => {
      if (c.signal.aborted) return;
      if (e instanceof ApiError) { console.error('GET /ranking', e.status, e.code, e.fields); setProblem('error'); }
      else setProblem('offline');                        // se queda lo último
    }).finally(() => {
      if (ctrl.current !== c) return;
      ctrl.current = null;
      setMore(false);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    fetchPage({ sort, q: query, limit: PAGE_SIZE, offset: 0 }, 'replace');
    return () => { ctrl.current?.abort(); ctrl.current = null; };
  }, [sort, query, retries, fetchPage]);

  useEffect(() => {
    const kick = () => { if (!document.hidden) fetchPage({ sort, q: query, limit: PAGE_SIZE, offset: 0 }, 'refresh'); };
    document.addEventListener('visibilitychange', kick);
    window.addEventListener('focus', kick);
    return () => { document.removeEventListener('visibilitychange', kick); window.removeEventListener('focus', kick); };
  }, [sort, query, fetchPage]);

  const more = () => { if (!data) return; setMore(true); fetchPage({ sort, q: query, limit: PAGE_SIZE, offset: data.items.length }, 'more'); };
  // cambiar orden o búsqueda deja la lista anterior a la vista, marcada como ocupada, hasta que llega la nueva
  const stale = !!data && (data.sort !== sort || (data.q ?? '').toLowerCase() !== query.toLowerCase());
  const busy: Busy = more_ ? 'more' : stale ? 'replace' : null;
  const retry = () => setRetries(n => n + 1);

  return { sort, setSort, q, setQ, data, busy, problem, more, retry };
}
