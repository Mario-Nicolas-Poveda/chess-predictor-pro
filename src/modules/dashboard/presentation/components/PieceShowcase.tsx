'use client';

import { useEffect } from 'react';
import { ThreeCanvas } from '@/components/three/ThreeCanvas';
import { useThreeScene } from '@/components/three/useThreeScene';
import { PROFILE_PIECES } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';
import { usePreferences } from '../preferences/PreferencesProvider';
import { PIECE_LABEL, THEME_3D, accentHex } from '../theme/themes';

const loadPiece = () => import('@/components/three/scenes/pieceScene').then(mod => mod.createPieceScene);

// Pieza 3D del perfil sobre un pedestal; el selector de abajo hace lo mismo sin 3D.
export function PieceShowcase() {
  const { prefs, set } = usePreferences();
  const { canvasRef, scene, failed } = useThreeScene(loadPiece);
  useEffect(() => { scene?.setPiece(prefs.piece, prefs.material); }, [scene, prefs.piece, prefs.material]);
  useEffect(() => { scene?.setTheme(THEME_3D[prefs.theme], accentHex(prefs.theme, prefs.accent)); }, [scene, prefs.theme, prefs.accent]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      {failed ? (
        // sin WebGL: glifo grande sobre un pedestal de CSS
        <div aria-hidden="true" className="flex h-[380px] w-[340px] max-w-full flex-col items-center justify-end pb-12">
          <span className="font-chess text-[160px] leading-none text-ink">{PIECE_LABEL[prefs.piece].glyph}</span>
          <span className="h-5 w-44 rounded-sm bg-loss" />
        </div>
      ) : (
        <ThreeCanvas ref={canvasRef} ready={!!scene} className="h-[380px] w-[340px] max-w-full" />
      )}
      <fieldset>
        <legend className="sr-only">Pieza del perfil</legend>
        <div className="flex flex-wrap justify-center gap-1.5">
          {PROFILE_PIECES.map(p => (
            <label key={p} title={PIECE_LABEL[p].name} className="cursor-pointer">
              <input type="radio" name="profile-piece" value={p} checked={prefs.piece === p} onChange={() => set('piece', p)}
                aria-label={PIECE_LABEL[p].name} className="peer sr-only" />
              <span aria-hidden="true" className="grid size-[42px] place-items-center rounded-full font-chess text-xl shadow-[inset_0_0_0_1px_var(--t-rule)] transition-colors hover:bg-band peer-checked:bg-ink peer-checked:text-paper peer-checked:shadow-none peer-checked:hover:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                {PIECE_LABEL[p].glyph}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-1 font-mono text-[11px] text-ink-faint">Elige tu pieza · arrastra para girarla</p>
    </div>
  );
}
