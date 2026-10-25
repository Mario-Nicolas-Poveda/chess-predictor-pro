'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Section';
import { ApiError } from '@/lib/apiClient';
import { AvatarDialog } from '../avatar/AvatarDialog';
import { avatarApi } from '../avatar/avatarApi';
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
  const router = useRouter();
  const [photoOpen, setPhotoOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (error) return (
    <div role="alert" className="mx-auto max-w-[1200px] space-y-4 px-5 py-16 lg:px-10">
      <p className="text-ink-soft">{error}</p>
      <Button variant="ghost" onClick={retry}>Reintentar</Button>
    </div>
  );

  if (!profile) return <ProfileSkeleton />;

  const removePhoto = async () => {
    setRemoving(true);
    try {
      await avatarApi.remove();
      setProfile({ ...profile, avatarUrl: null });
      setConfirming(false);
      toast.success('Foto quitada.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.replace('/login?next=/dashboard/profile');
      else toast.error('No se pudo quitar la foto. Intenta de nuevo.');
    } finally { setRemoving(false); }
  };
  const btn = 'h-11! px-5! text-[15px]';

  return (
    <>
      <ProfileContent profile={profile} history={history} results={results} achievements={[]}
        onEdit={() => sheetRef.current?.showModal()} onPhoto={() => setPhotoOpen(true)} actions={<>
          <Button className={btn} onClick={() => customizeRef.current?.showModal()}>
            <SlidersHorizontal size={16} aria-hidden="true" /> Personalizar
          </Button>
          <Button variant="ghost" className={btn} onClick={() => setPhotoOpen(true)}>{profile.avatarUrl ? 'Cambiar foto' : 'Subir foto'}</Button>
          {profile.avatarUrl && !confirming && <Button variant="ghost" className={btn} onClick={() => setConfirming(true)}>Quitar foto</Button>}
          {confirming && (
            <p role="group" aria-label="Quitar foto" className="flex basis-full flex-wrap items-center gap-3 text-[15px]">
              ¿Quitar tu foto? Volverás a la inicial.
              <Button className={btn} loading={removing} onClick={() => void removePhoto()}>Quitar foto</Button>
              <Button variant="ghost" className={btn} disabled={removing} onClick={() => setConfirming(false)}>Cancelar</Button>
            </p>
          )}
        </>} />
      <AvatarDialog open={photoOpen} onClose={() => setPhotoOpen(false)} onSaved={avatarUrl => setProfile({ ...profile, avatarUrl })} />
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
