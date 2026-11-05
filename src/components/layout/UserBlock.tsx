'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { logout } from '@/modules/auth/presentation/logout';
import { useProfile } from '@/modules/dashboard/presentation/hooks/useProfile';

export function UserBlock({ className = '' }: { className?: string }) {
  const { profile } = useProfile();
  const [leaving, setLeaving] = useState(false);   // la salida es una navegación completa: la página no vuelve con este estado
  if (!profile) return null;

  const leave = () => { setLeaving(true); void logout(); };

  return (
    <div className={`items-center gap-3 ${className}`}>
      <Avatar user={profile} size={40} />
      <div className="leading-tight">
        <p className="text-sm font-medium text-ink">{profile.username}</p>
        <button type="button" onClick={leave} disabled={leaving}
          className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink disabled:opacity-60">
          {leaving ? 'Saliendo…' : 'Cerrar sesión'}
        </button>
      </div>
    </div>
  );
}
