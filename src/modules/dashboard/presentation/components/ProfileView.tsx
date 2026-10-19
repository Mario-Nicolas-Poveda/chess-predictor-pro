'use client';

import { useRef } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Section';
import { useProfile } from '../hooks/useProfile';
import { useProfileHistory } from '../hooks/useProfileHistory';
import { CustomizeSheet } from './CustomizeSheet';
import { EditProfileSheet } from './EditProfileSheet';
import { ProfileContent } from './ProfileContent';


export function ProfileView() {
  const { profile, setProfile, error, retry } = useProfile();
  const { history, results } = useProfileHistory();
  const sheetRef = useRef<HTMLDialogElement>(null);
  const customizeRef = useRef<HTMLDialogElement>(null);

  if (error) return (
    <div role="alert" className="mx-auto max-w-[1200px] space-y-4 px-5 py-16 lg:px-10">
      <p className="text-ink-soft">{error}</p>
      <Button variant="ghost" onClick={retry}>Reintentar</Button>
    </div>
  );

  if (!profile) return <ProfileSkeleton />;

  return (
    <>
      <ProfileContent profile={profile} history={history} results={results} achievements={[]} onEdit={() => sheetRef.current?.showModal()} actions={
        <Button className="h-11! px-5! text-[15px]" onClick={() => customizeRef.current?.showModal()}>
          <SlidersHorizontal size={16} aria-hidden="true" /> Personalizar
        </Button>
      } />
      <EditProfileSheet ref={sheetRef} profile={profile} onSaved={setProfile} />
      <CustomizeSheet ref={customizeRef} />
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando perfil" className="mx-auto max-w-[1200px] px-5 pb-[96px] pt-[72px] lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-x-12 gap-y-8">
        <div className="flex flex-[1_1_380px] flex-col gap-6">
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-28 w-2/3" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-[380px] w-[340px] max-w-full" />
        <div className="flex flex-col items-end gap-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-32 w-64" />
        </div>
      </div>
    </div>
  );
}
