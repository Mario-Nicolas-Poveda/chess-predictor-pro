import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Profile } from '@/modules/dashboard/infrastructure/dto/profileSchemas';

const monthYear = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });
const regions = new Intl.DisplayNames(['es'], { type: 'region' });

export function ProfileHeader({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const country = profile.country ? regions.of(profile.country) : null;
  const since = `Miembro desde ${monthYear.format(new Date(profile.createdAt))}`;
  return (
    <header className="grid gap-10 pb-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="min-w-0">
        <div className="flex items-center gap-4">
          {profile.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa del usuario, sin configurar dominios
            <img src={profile.avatarUrl} alt="" width={56} height={56} className="size-14 rounded-full object-cover" />
          )}
          <p className="eyebrow">Perfil · {profile.email}</p>
        </div>
        <h1 className="mt-4 break-words font-display text-[clamp(4rem,12vw,9rem)] leading-[.85] tracking-[-.02em]">
          {profile.username}
        </h1>
        <p className="mt-6 text-ink-soft">{[profile.displayName, country, since].filter(Boolean).join(' · ')}</p>
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
      <p className="mt-6 font-display text-[clamp(5rem,12vw,9.5rem)] leading-none text-wine onum">{elo}</p>
      <p className="text-sm text-ink-soft">Sin partidas todavía</p>
    </div>
  );
}
