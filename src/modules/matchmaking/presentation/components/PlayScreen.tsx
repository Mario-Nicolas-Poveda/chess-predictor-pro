'use client';

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import type { PlayPhase } from '@/components/three/scenes/playScene';
import { useProfile } from '@/modules/dashboard/presentation/hooks/useProfile';
import { useMatchmaking, type PlayState } from '../hooks/useMatchmaking';
import { Lobby } from './Lobby';
import { MatchFound } from './MatchFound';
import { PlayLayout, PlayStage } from './PlayStage';
import { Searching } from './Searching';

const stagePhase = (s: PlayState): PlayPhase =>
  s.phase === 'searching' || s.phase === 'leaving' ? 'searching' : s.phase === 'matched' ? 'matched' : 'lobby';

const announce = (s: PlayState) =>
  s.phase === 'searching' ? 'Buscando rival' : s.phase === 'matched' ? `Partida encontrada contra ${s.match.opponent.username}` : '';

export function PlayScreen() {
  const { state, join, cancel, abandon } = useMatchmaking();
  const { profile } = useProfile();
  const phase = stagePhase(state);
  const halfWidth = state.phase === 'searching' || state.phase === 'leaving'
    ? (state.status.eloRange.max - state.status.eloRange.min) / 2 : 100;

  return (
    <PlayLayout stage={<PlayStage phase={phase} halfWidth={halfWidth} />}>
      <p role="status" aria-live="polite" className="sr-only">{announce(state)}</p>
      <AnimatePresence mode="wait" initial={false}>
        <m.section key={phase} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .45 }}>
          {state.phase === 'searching' || state.phase === 'leaving'
            ? <Searching status={state.status} leaving={state.phase === 'leaving'} onCancel={cancel} />
            : state.phase === 'matched'
              ? <MatchFound match={state.match} onBack={() => abandon(state.match.id)} />
              : <Lobby busy={state.phase !== 'lobby'} joining={state.phase === 'joining'}
                  error={state.phase === 'lobby' ? state.error : undefined} elo={profile?.eloRating} onJoin={join} />}
        </m.section>
      </AnimatePresence>
    </PlayLayout>
  );
}
