'use client';

import { useState, type FormEvent } from 'react';
import type { Move } from 'chess.js';
import { normSan, sanEs } from '@/components/chess/san';
import { PROMO_HINT } from '../hooks/useGame';

/** Escribir la jugada: se compara con las legales en español (normSan) y se manda su UCI. */
export function SanInput({ legal, disabled, onPlay }: { legal: Move[]; disabled: boolean; onPlay: (uci: string) => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const want = normSan(text);
    if (!want) return;
    const m = legal.find(l => normSan(sanEs(l.san)) === want);
    if (!m) {
      // 'g8' sin pieza y solo coincide una coronación: pedir la pieza, nunca dama por defecto
      const promo = legal.some(l => l.promotion && normSan(sanEs(l.san)).slice(0, -1) === want);
      setError(promo ? PROMO_HINT : `«${text.trim()}» no es una jugada legal aquí.`); return;
    }
    setError(''); setText('');
    onPlay(m.from + m.to + (m.promotion ?? ''));
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor="san" className="text-caption font-medium">Escribe tu jugada</label>
      <div className="flex gap-2">
        <input id="san" type="text" autoComplete="off" spellCheck={false} placeholder="Cf3, exd5, O-O" value={text} disabled={disabled}
          onChange={e => { setText(e.target.value); setError(''); }} aria-describedby="san-help" aria-invalid={!!error || undefined}
          className="h-12 min-w-0 flex-auto rounded-[14px] border border-rule bg-vellum px-4 font-mono text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none disabled:opacity-60" />
        <button type="submit" disabled={disabled}
          className="h-12 rounded-full bg-accent px-[22px] font-medium text-on-accent hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60">Jugar</button>
      </div>
      <p id="san-help" aria-live="polite" className={`text-[13px] ${error ? 'text-accent' : 'text-ink-faint'}`}>
        {error || 'R rey · D dama · T torre · A alfil · C caballo. También sirve tocar las piezas.'}
      </p>
    </form>
  );
}
