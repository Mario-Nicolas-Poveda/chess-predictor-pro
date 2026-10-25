'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/apiClient';
import { useProfile } from '../hooks/useProfile';
import { avatarApi } from './avatarApi';

/** "Quitar foto" con confirmación en línea → DELETE → la inicial. Nada si no hay foto. */
export function RemoveAvatar({ className = '', label = 'Quitar foto' }: { className?: string; label?: string }) {
  const { profile, setProfile } = useProfile();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  if (!profile?.avatarUrl) return null;

  const remove = async () => {
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

  if (!confirming) return <Button variant="ghost" className={className} onClick={() => setConfirming(true)}>{label}</Button>;
  return (
    <p role="group" aria-label="Quitar foto" className="flex basis-full flex-wrap items-center gap-3 text-[15px]">
      ¿Quitar tu foto? Volverás a la inicial.
      <Button className={className} loading={removing} onClick={() => void remove()}>Quitar foto</Button>
      <Button variant="ghost" className={className} disabled={removing} onClick={() => setConfirming(false)}>Cancelar</Button>
    </p>
  );
}
