'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/Avatar';
import { authApi } from '@/modules/auth/presentation/api/authApi';
import { useProfile } from '@/modules/dashboard/presentation/hooks/useProfile';

export function UserBlock({ className = '' }: { className?: string }) {
  const { profile } = useProfile();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  if (!profile) return null;

  const logout = async () => {
    setLeaving(true);
    try {
      await authApi.logout();
      router.replace('/login');
      router.refresh();
    } catch {
      setLeaving(false);
      toast.error('No se pudo cerrar la sesión. Intenta de nuevo.');
    }
  };

  return (
    <div className={`items-center gap-3 ${className}`}>
      <Avatar key={profile.avatarUrl} src={profile.avatarUrl} size={40} fallback={
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-ink font-display text-xl text-cream">
          {profile.username.charAt(0).toUpperCase()}
        </span>
      } />
      <div className="leading-tight">
        <p className="text-sm font-medium text-ink">{profile.username}</p>
        <button type="button" onClick={logout} disabled={leaving}
          className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink disabled:opacity-60">
          {leaving ? 'Cerrando…' : 'Cerrar sesión'}
        </button>
      </div>
    </div>
  );
}
