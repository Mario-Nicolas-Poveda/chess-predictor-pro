'use client';

import { useEffect, type ReactNode } from 'react';
import { ThreeCanvas } from '@/components/three/ThreeCanvas';
import { useThreeScene } from '@/components/three/useThreeScene';
import type { PlayPhase } from '@/components/three/scenes/playScene';
import { KnightLoop } from './KnightLoop';

const loadPlay = () => import('@/components/three/scenes/playScene').then(m => m.createPlayScene);

const STAGE_LABEL: Record<PlayPhase, string> = {
  lobby: 'Los reyes esperan', searching: 'Buscando en tu rango', matched: 'Frente a frente', arena: 'Posición inicial',
};

// React manda: cada cambio de fase o rango llega a la escena por un efecto.
export function PlayStage({ phase, halfWidth = 100 }: { phase: PlayPhase; halfWidth?: number }) {
  const { canvasRef, scene, failed } = useThreeScene(loadPlay);
  useEffect(() => { scene?.setPhase(phase); }, [scene, phase]);
  useEffect(() => { scene?.setRange(halfWidth); }, [scene, halfWidth]);
  if (failed) return <KnightLoop />;
  return (
    <ThreeCanvas ref={canvasRef} ready={!!scene} className="aspect-square w-full max-w-[600px] rounded-[28px] bg-band">
      <p aria-hidden="true" className="absolute bottom-4 left-5 font-mono text-[11px] uppercase tracking-[.14em] text-ink-faint">{STAGE_LABEL[phase]}</p>
    </ThreeCanvas>
  );
}

/** Dos columnas (texto · escenario); en móvil el escenario va debajo. El escenario no se vuelve a montar entre fases. */
export function PlayLayout({ stage, children }: { stage: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-16 gap-y-12">
      <div className="min-w-0 flex-[1_1_440px]">{children}</div>
      <div className="flex min-w-0 flex-[1_1_520px] justify-center">{stage}</div>
    </div>
  );
}
