'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Section';
import { useProfile } from '../hooks/useProfile';
import { EditProfileSheet } from './EditProfileSheet';
import { EmptyHistory } from './EmptyHistory';
import { ProfileHeader } from './ProfileHeader';
import { RecordSection } from './RecordSection';

export function ProfileView() {
  const { profile, setProfile, error, retry } = useProfile();
  const sheetRef = useRef<HTMLDialogElement>(null);

  if (error) return (
    <div role="alert" className="space-y-4">
      <p className="text-ink-soft">{error}</p>
      <Button variant="ghost" onClick={retry}>Reintentar</Button>
    </div>
  );

  if (!profile) return <ProfileSkeleton />;

  return (
    <>
      <ProfileHeader profile={profile} onEdit={() => sheetRef.current?.showModal()} />
      <RecordSection stats={profile.stats} />
      <EmptyHistory />
      <EditProfileSheet ref={sheetRef} profile={profile} onSaved={setProfile} />
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando perfil">
      <div className="grid gap-10 pb-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-6">
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-28 w-2/3" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="space-y-6 lg:items-end">
          <Skeleton className="h-3 w-24 lg:ml-auto" />
          <Skeleton className="h-32 w-64" />
        </div>
      </div>
      <div className="border-t border-rule pt-8">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-8 h-20 w-full" />
      </div>
    </div>
  );
}
