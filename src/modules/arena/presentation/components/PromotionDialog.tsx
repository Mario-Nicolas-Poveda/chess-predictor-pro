'use client';

import { useEffect, useRef } from 'react';
import { glyph } from '@/components/chess/glyphs';
import type { PieceType } from '@/components/chess/types';

const OPTIONS: [PieceType, string][] = [['q', 'Dama'], ['r', 'Torre'], ['b', 'Alfil'], ['n', 'Caballo']];

/** Sobre el escenario: el foco entra al primer botón; Esc o tocar fuera cancelan (la pieza vuelve a su casilla). */
export function PromotionDialog({ color, onPick, onCancel }: { color: 'w' | 'b'; onPick: (t: PieceType) => void; onCancel: () => void }) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => { first.current?.focus(); }, []);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="promo-title" onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-paper/74 px-3 backdrop-blur-[6px] sm:gap-[22px] sm:px-0">
      <h2 id="promo-title" className="font-display text-[28px] font-semibold leading-none sm:text-[40px]">Corona tu peón.</h2>
      <div className="grid w-full max-w-[276px] grid-cols-4 gap-2 sm:flex sm:w-auto sm:max-w-none sm:justify-center sm:gap-3">
        {OPTIONS.map(([t, label], i) => (
          <button key={t} ref={i === 0 ? first : undefined} type="button" onClick={() => onPick(t)}
            className="flex h-[84px] min-w-0 flex-col items-center sm:h-[100px] sm:w-[88px] justify-center gap-1.5 rounded-[20px] bg-vellum shadow-[inset_0_0_0_1px_var(--t-rule)] hover:shadow-[inset_0_0_0_1px_var(--t-ink)]">
            <span aria-hidden="true" className="font-chess text-[34px] leading-none sm:text-[44px]">{glyph(t, color)}</span>
            <span className="text-xs text-ink-soft sm:text-[13px]">{label}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onCancel} className="min-h-11 px-3 text-[15px] font-medium text-accent hover:underline">Cancelar</button>
    </div>
  );
}
