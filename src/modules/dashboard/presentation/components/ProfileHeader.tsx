import { Pencil } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { Profile } from '@/modules/dashboard/infrastructure/dto/profileSchemas';

const monthYear = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });
const regions = new Intl.DisplayNames(['es'], { type: 'region' });

// El usuario va enorme, pero hasta 20 caracteres deben caber en una línea.
const nameSize = (name: string) =>
  name.length <= 8 ? 'text-[clamp(4rem,12vw,9rem)]'
  : name.length <= 14 ? 'text-[clamp(3rem,8vw,6.5rem)]'
  : 'text-[clamp(2.25rem,6vw,4.75rem)]';

export function ProfileHeader({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const country = profile.country ? regions.of(profile.country) : null;
  const since = `Miembro desde ${monthYear.format(new Date(profile.createdAt))}`;
  return (
    <header className="grid gap-10 pb-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="min-w-0">
        <div className="flex items-center gap-4">
          <Avatar key={profile.avatarUrl} src={profile.avatarUrl} size={56} />
          <p className="eyebrow">Perfil · {profile.email}</p>
        </div>
        <h1 className={`mt-4 break-words pb-[.18em] font-display leading-[.85] tracking-[-.02em] ${nameSize(profile.username)}`}>
          {profile.username}
        </h1>
        <p className="mt-4 text-ink-soft">{[profile.displayName, country, since].filter(Boolean).join(' · ')}</p>
        <Button variant="quiet" className="mt-6" onClick={onEdit}><Pencil size={14} aria-hidden="true" /> Editar perfil</Button>
      </div>
      <EloFigure elo={profile.eloRating} />
    </header>
  );
}

function EloFigure({ elo }: { elo: number }) {
  return (
    <div className="lg:text-right">
      <p className="eyebrow">ELO actual</p>
      <p className="mt-6 font-display text-[clamp(5rem,12vw,9.5rem)] leading-none text-accent nums">{elo}</p>
      <p className="text-sm text-ink-soft">Sin partidas todavía</p>
    </div>
  );
}
