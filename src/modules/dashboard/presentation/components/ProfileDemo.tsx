'use client';

import { demoExtras, demoProfile } from '../fixtures/profileDemo';
import { PreferencesProvider } from '../preferences/PreferencesProvider';
import { ProfileContent } from './ProfileContent';

export function ProfileDemo() {
  return (
    <PreferencesProvider initial={demoProfile.preferences}>
      <p className="fixed right-4 top-4 z-10 rounded-full bg-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[.14em] text-paper">Datos de ejemplo</p>
      <ProfileContent profile={demoProfile} {...demoExtras} />
    </PreferencesProvider>
  );
}
