'use client';

import { useEffect, useRef } from 'react';
import { glyph } from '@/components/chess/glyphs';
import type { PieceType } from '@/components/chess/types';

const OPTIONS: [PieceType, string][] = [['q', 'Dama'], ['r', 'Torre'], ['b', 'Alfil'], ['n', 'Caballo']];

/** Sobre el escenario: el foco entra al primer botón y Esc cancela. */
export function PromotionDialog({ color, onPick, onCancel }: { color: 'w' | 'b'; onPick: (t: PieceType) => void; onCancel: () => void }) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => { first.current?.focus(); }, []);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="promo-title" onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-[22px] bg-paper/74 backdrop-blur-[6px]">
      <h2 id="promo-title" className="font-display text-[40px] font-semibold leading-none">Corona tu peón.</h2>
      <div className="flex flex-wrap justify-center gap-3">
        {OPTIONS.map(([t, label], i) => (
          <button key={t} ref={i === 0 ? first : undefined} type="button" onClick={() => onPick(t)}
            className="flex h-[100px] w-[88px] flex-col items-center justify-center gap-1.5 rounded-[20px] bg-vellum shadow-[inset_0_0_0_1px_var(--t-rule)] hover:shadow-[inset_0_0_0_1px_var(--t-ink)]">
            <span aria-hidden="true" className="font-chess text-[44px] leading-none">{glyph(t, color)}</span>
            <span className="text-[13px] text-ink-soft">{label}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onCancel} className="px-3 py-2 text-[15px] font-medium text-accent hover:underline">Cancelar</button>
    </div>
  );
}
