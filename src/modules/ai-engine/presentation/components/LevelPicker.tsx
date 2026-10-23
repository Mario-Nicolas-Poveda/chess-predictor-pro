'use client';

import type { KeyboardEvent } from 'react';
import { glyph } from '@/components/chess/glyphs';
import type { AiLevel, AiLevelInfo } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';

/** Cinco niveles como radios nativos (flechas gratis); Inicio y Fin van al primero y al último. */
export function LevelPicker({ levels, value, recommended, onChange }: {
  levels: AiLevelInfo[]; value: AiLevel; recommended: AiLevel; onChange: (l: AiLevel) => void;
}) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const l = levels[e.key === 'Home' ? 0 : levels.length - 1]!.level;
    onChange(l);
    (e.currentTarget.querySelector(`input[value="${l}"]`) as HTMLInputElement | null)?.focus();
  };
  return (
    <fieldset onKeyDown={onKey} className="flex flex-col gap-2.5">
      <legend className="eyebrow mb-3">Nivel</legend>
      {levels.map(l => {
        const on = l.level === value;
        return (
          <label key={l.level} className="cursor-pointer">
            <input type="radio" name="ai-level" value={l.level} checked={on} onChange={() => onChange(l.level)} className="peer sr-only" />
            <span className={`flex items-center gap-5 rounded-[22px] px-4 py-3.5 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${on ? 'bg-ink text-paper' : 'shadow-[inset_0_0_0_1px_var(--t-rule)] hover:bg-band'}`}>
              <span aria-hidden="true" className={`grid size-[52px] shrink-0 place-items-center rounded-full font-chess text-[28px] ${on ? 'bg-paper text-ink' : 'bg-band'}`}>{glyph(l.piece, 'b')}</span>
              <span className="flex min-w-0 flex-auto flex-col gap-0.5">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display text-[26px] font-semibold leading-none">{l.name}</span>
                  <span className="font-mono text-xs opacity-80">Nivel {l.level}</span>
                  {l.level === recommended && <span className="rounded-full bg-band px-2.5 py-0.5 text-[13px] text-ink">Recomendado para ti</span>}
                </span>
                <span className={on ? 'opacity-85' : 'text-ink-soft'}>{l.description}</span>
              </span>
              <span className="shrink-0 font-mono text-sm nums">≈ {l.elo}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
