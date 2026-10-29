'use client';

import { useEffect } from 'react';
import { glyph } from '@/components/chess/glyphs';
import { ThreeCanvas } from '@/components/three/ThreeCanvas';
import { useThreeScene } from '@/components/three/useThreeScene';
import type { AiLevelInfo } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import { usePreferences } from '@/modules/dashboard/presentation/preferences/PreferencesProvider';
import { THEME_3D, accentHex } from '@/modules/dashboard/presentation/theme/themes';

// el mismo pedestal 3×3 del perfil: la pieza cae con rebote al cambiar y gira sola solo en calidad alta
const loadPiece = () => import('@/components/three/scenes/pieceScene').then(mod => mod.createPieceScene);

export function LevelPedestal({ level }: { level: AiLevelInfo }) {
  const { prefs } = usePreferences();
  const { canvasRef, scene, failed } = useThreeScene(loadPiece);
  useEffect(() => { scene?.setPiece(level.piece, 'w'); }, [scene, level.piece]);
  useEffect(() => { scene?.setTheme(THEME_3D[prefs.theme], accentHex(prefs.theme, prefs.accent)); }, [scene, prefs.theme, prefs.accent]);

  const box = 'aspect-[16/9] w-full rounded-[24px] bg-band';
  if (failed) return <div aria-hidden="true" className={`${box} grid place-items-center font-chess text-[140px] leading-none`}>{glyph(level.piece, 'w')}</div>;
  return <ThreeCanvas ref={canvasRef} ready={!!scene} className={box} />;
}
