'use client';

import type { GameReviewDTO, MoveClass } from '@/modules/coach/infrastructure/dto/coachSchemas';
import type { JobView } from '../lib/jobController';
import { MOVE_CLASS_UI } from '../lib/moveClass';
import { CoachTips } from './CoachTips';
import { EvalGraph } from './EvalGraph';
import { KeyMoments } from './KeyMoments';
import { ReviewState } from './ReviewState';

type Props = {
  view: JobView<GameReviewDTO>; onRequest: () => void; onReanalyze: () => void;
  ply: number; onPly: (ply: number) => void;          // la jugada de la repetición
  moment: number | null; onMoment: (ply: number, toggle: boolean) => void;   // el momento con flechas en el tablero
};

const PILLS: { cls: MoveClass; many: string }[] = [
  { cls: 'inaccuracy', many: 'imprecisiones' }, { cls: 'mistake', many: 'errores' }, { cls: 'blunder', many: 'errores graves' },
];
const SOURCE_NOTE = {
  llm: 'Escrito por un modelo de lenguaje con el análisis del motor. Puede equivocarse.',
  template: 'Consejos automáticos a partir del análisis del motor.',
};

/** La pestaña "Análisis" de la repetición. El análisis sale del servidor: aquí no se recalcula nada. */
export function ReviewPanel({ view, onRequest, onReanalyze, ply, onPly, moment, onMoment }: Props) {
  const live = view.kind === 'ready' ? 'Análisis listo.' : view.kind === 'pending' ? 'Analizando tu partida…' : '';
  return (
    <div aria-busy={view.kind === 'pending'} className="flex flex-col gap-3">
      <p aria-live="polite" className="sr-only">{live}</p>
      {view.kind === 'ready' && view.data.analysis && view.data.coach
        ? <Ready review={view.data} analysis={view.data.analysis} coach={view.data.coach}
            ply={ply} onPly={onPly} moment={moment} onMoment={onMoment} onReanalyze={onReanalyze} />
        : view.kind === 'ready' ? null : <ReviewState view={view} onRequest={onRequest} />}
    </div>
  );
}

function Ready({ review, analysis, coach, ply, onPly, moment, onMoment, onReanalyze }: {
  review: GameReviewDTO; analysis: NonNullable<GameReviewDTO['analysis']>; coach: NonNullable<GameReviewDTO['coach']>;
} & Pick<Props, 'ply' | 'onPly' | 'moment' | 'onMoment' | 'onReanalyze'>) {
  const you = review.yourColor === 'white' ? analysis.white : analysis.black;
  const rival = review.yourColor === 'white' ? analysis.black : analysis.white;
  return (
    <>
      <div className="flex flex-col gap-3.5 rounded-[14px] border border-rule bg-vellum p-4">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[.12em] text-ink-soft">Análisis{analysis.opening ? ` · ${analysis.opening}` : ''}</p>
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
          <div className="flex items-end gap-[22px]">
            <div className="flex flex-col gap-0.5">
              <span className="font-display text-[44px] font-semibold leading-none">{you.accuracy} %</span>
              <span className="font-mono text-xs text-ink-soft">Tu precisión</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-display text-[26px] font-semibold leading-none text-ink-soft">{rival.accuracy} %</span>
              <span className="font-mono text-xs text-ink-soft">Rival</span>
            </div>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {PILLS.map(({ cls, many }) => {
              const c = MOVE_CLASS_UI[cls], n = you.counts[cls];
              return (
                <li key={cls} aria-label={`${n} ${n === 1 ? c.label.toLowerCase() : many}`}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 font-mono text-xs font-medium shadow-[inset_0_0_0_1px_var(--t-rule)]">
                  <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: c.color! }} />
                  <span aria-hidden="true">{c.symbol} {n}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <EvalGraph winWhite={analysis.winWhite} moves={analysis.moves} keyMoments={analysis.keyMoments} ply={ply} onPly={onPly} />
      </div>
      <KeyMoments moves={analysis.moves} plies={analysis.keyMoments} active={moment} onPick={p => onMoment(p, true)} />
      <CoachTips coach={coach} moves={analysis.moves} onPick={p => onMoment(p, false)} />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="max-w-[320px] font-mono text-xs text-ink-soft">{SOURCE_NOTE[coach.source]}</p>
        <button type="button" onClick={onReanalyze} className="min-h-10 font-mono text-[13px] font-medium underline underline-offset-4">Volver a analizar</button>
      </div>
    </>
  );
}
