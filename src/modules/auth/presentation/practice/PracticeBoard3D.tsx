'use client';

import { useEffect, useState } from 'react';
import * as m from 'motion/react-m';
import { ThreeCanvas } from '@/components/three/ThreeCanvas';
import { useThreeScene } from '@/components/three/useThreeScene';
import { EASE_OUT } from '@/lib/motion';
import type { Candidate } from './book';
import { usePracticeGame } from './usePracticeGame';

const loadPractice = () => import('@/components/three/scenes/practiceScene').then(mod => mod.createPracticeScene);

export default function PracticeBoard3D({ onFail }: { onFail: () => void }) {
  const game = usePracticeGame();
  const { canvasRef, scene, failed } = useThreeScene(loadPractice);
  const [pickable, setPickable] = useState(false);

  useEffect(() => { scene?.onSquare(game.onSquare); scene?.onPickable(setPickable); }, [scene, game.onSquare]);
  useEffect(() => { scene?.update(game.view); }, [scene, game.view]);       // React empuja; la escena obedece
  useEffect(() => { if (failed) onFail(); }, [failed, onFail]);              // sin WebGL: solo el formulario

  if (failed) return null;
  return (
    <>
      <ThreeCanvas ref={canvasRef} ready={!!scene} className="aspect-square w-full max-w-[600px] rounded-[28px] bg-[#e6d9c4]"
        style={{ cursor: pickable ? 'pointer' : 'default' }}>
        <p role="status" aria-live="polite" className="pointer-events-none absolute inset-x-5 bottom-4 font-display text-[21px] italic text-[#2a1417]">{game.status}</p>
      </ThreeCanvas>
      <Candidates items={game.candidates} disabled={game.busy} onPlay={game.playCandidate} onReset={game.reset} />
    </>
  );
}

function Candidates({ items, disabled, onPlay, onReset }:
  { items: Candidate[]; disabled: boolean; onPlay: (c: Candidate) => void; onReset: () => void }) {
  return (
    <div className="flex w-full max-w-[600px] flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[.14em] text-ink-faint">Jugadas más probables · ejemplo</p>
        <button type="button" onClick={onReset} className="py-1.5 text-caption font-medium text-wine-deep hover:underline">Reiniciar posición</button>
      </div>
      {items.length ? (
        <ol className="flex flex-col gap-0.5">
          {items.map(c => (
            <li key={c.from + c.to}>
              <button type="button" disabled={disabled} onClick={() => onPlay(c)}
                className="grid w-full grid-cols-[4.5rem_minmax(0,1fr)_8rem_3rem] items-center gap-3.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-wash disabled:cursor-wait disabled:opacity-60">
                <span className="font-mono font-medium"><span className="sr-only">Jugar </span>{c.san}</span>
                <span aria-hidden="true" className="h-1 overflow-hidden rounded-sm bg-[#e2d6c5]">
                  <m.span className="block h-full rounded-sm bg-wine" style={{ originX: 0 }}
                    initial={{ scaleX: 0 }} animate={{ scaleX: c.pct / 100 }} transition={{ duration: .6, ease: EASE_OUT }} />
                </span>
                <span className="text-caption text-ink-soft">{c.name}</span>
                <span className="text-right font-mono text-[13px] text-ink-soft nums">{c.pct} <span aria-hidden="true">%</span><span className="sr-only">por ciento</span></span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-3 py-2 text-caption text-ink-soft">Sin datos de predicción para esta posición en la demo.</p>
      )}
    </div>
  );
}
