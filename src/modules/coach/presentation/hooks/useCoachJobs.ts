'use client';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { CoachSummaryDTO, GameReviewDTO } from '@/modules/coach/infrastructure/dto/coachSchemas';
import { coachApi } from '../api/coachApi';
import { JobController, type JobApi, type JobView } from '../lib/jobController';

function useJob<T extends GameReviewDTO | CoachSummaryDTO>(ctl: JobController<T>) {
  useEffect(() => {
    ctl.start();
    const onVis = () => { if (!document.hidden) ctl.onVisible(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); ctl.stop(); };
  }, [ctl]);
  const view = useSyncExternalStore(ctl.subscribe, ctl.getSnapshot, ctl.getSnapshot);
  return { view, request: ctl.request, reanalyze: ctl.reanalyze };
}

/** Análisis de una partida. `auto`: lo pide si no existe (pantalla de resultado). En la repetición, con botón. */
export function useReview(matchId: string, { auto = false } = {}): {
  view: JobView<GameReviewDTO>; request: () => Promise<void>; reanalyze: () => Promise<void>;
} {
  const ctl = useMemo(() => {
    const api: JobApi<GameReviewDTO> = {
      get: (etag, signal) => coachApi.review(matchId, etag, signal),
      request: signal => coachApi.requestReview(matchId, signal),
      remove: () => coachApi.deleteReview(matchId),
    };
    return new JobController(api, { notFoundCode: 'REVIEW_NOT_FOUND', auto });
  }, [matchId, auto]);
  return useJob(ctl);
}

/** Plan del entrenador: lo pide si no existe y lo rehace si quedó viejo (mientras tanto se ve el anterior). */
export function useCoachSummary() {
  const ctl = useMemo(() => new JobController<CoachSummaryDTO>({
    get: (etag, signal) => coachApi.summary(etag, signal),
    request: signal => coachApi.requestSummary(signal),
  }, { notFoundCode: 'SUMMARY_NOT_FOUND', auto: true, autoWhen: s => s.status === 'ready' && s.stale }), []);
  return useJob(ctl);
}
