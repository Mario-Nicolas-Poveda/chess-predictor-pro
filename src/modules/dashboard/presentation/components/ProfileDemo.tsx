'use client';

import { useRef } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { demoExtras, demoProfile } from '../fixtures/profileDemo';
import { PreferencesProvider } from '../preferences/PreferencesProvider';
import { CustomizeSheet } from './CustomizeSheet';
import { ProfileContent } from './ProfileContent';

// Muestra sin sesión: el panel funciona igual, pero nada se guarda en la API.
export function ProfileDemo() {
  const customizeRef = useRef<HTMLDialogElement>(null);
  return (
    <PreferencesProvider initial={demoProfile.preferences} persist={false}>
      <p className="fixed right-4 top-4 z-10 rounded-full bg-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[.14em] text-paper">Datos de ejemplo</p>
      <ProfileContent profile={demoProfile} {...demoExtras} actions={
        <Button className="h-11! px-5! text-[15px]" onClick={() => customizeRef.current?.showModal()}>
          <SlidersHorizontal size={16} aria-hidden="true" /> Personalizar
        </Button>
      } />
      <CustomizeSheet ref={customizeRef} />
    </PreferencesProvider>
  );
}
