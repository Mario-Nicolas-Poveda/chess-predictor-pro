'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { CountUp } from '@/components/motion/CountUp';
import { GrowBar } from '@/components/motion/GrowBar';
import { Button, buttonClass } from '@/components/ui/Button';
import { Band, BigNumber, SectionTitle } from '@/components/ui/Section';
import type { Profile } from '@/modules/dashboard/infrastructure/dto/profileSchemas';
import { usePreferences } from '../preferences/PreferencesProvider';
import type { SectionId } from '../theme/themes';
import { EloChart, type EloPoint } from './EloChart';
import { PieceShowcase } from './PieceShowcase';
import { ResultsStrip, type GameResult } from './ResultsStrip';

export type ProfileExtras = { history: EloPoint[]; results: GameResult[]; achievements: string[] };
type Props = ProfileExtras & { profile: Profile; onEdit?: () => void; actions?: ReactNode };

// fuera del componente: CountUp reinicia la cuenta si cambia la identidad de format
const percent = (v: number) => `${Math.round(v)}%`;
const monthYear = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });
const regions = new Intl.DisplayNames(['es'], { type: 'region' });

// Hasta 20 caracteres deben caber en una línea.
const nameSize = (name: string) =>
  name.length <= 8 ? 'text-[clamp(88px,10vw,152px)]'
  : name.length <= 14 ? 'text-[clamp(64px,7vw,104px)]'
  : 'text-[clamp(44px,5vw,72px)]';

// Orden de los tres bloques del encabezado según la preferencia
const HERO_ORDER = {
  clasico: { name: 0, piece: 1, elo: 2 },
  invertido: { name: 2, piece: 1, elo: 0 },
  pieza: { name: 1, piece: 0, elo: 2 },
} as const;

export function ProfileContent({ profile, history, results, achievements, onEdit, actions }: Props) {
  const { prefs } = usePreferences();
  const order = HERO_ORDER[prefs.heroLayout];
  const country = profile.country ? regions.of(profile.country) : null;
  const delta = history.length > 1 ? history[history.length - 1]!.elo - history[0]!.elo : null;

  // fondos alternos según el orden VISIBLE: la primera visible lleva band
  const visible = prefs.sectionOrder.filter(id => !prefs.hiddenSections.includes(id));
  const bandProps = (id: SectionId) => ({
    tone: visible.indexOf(id) % 2 === 0 ? 'band' as const : 'paper' as const,
    style: { order: prefs.sectionOrder.indexOf(id) + 1 },
    className: prefs.hiddenSections.includes(id) ? 'hidden' : '',
  });

  return (
    <div className="flex flex-col">
      <section aria-labelledby="who" className="order-none bg-paper px-5 pb-[96px] pt-[72px] lg:px-10">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-12 gap-y-8">
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4 animate-rise" style={{ order: order.name }}>
            <p className="eyebrow">Perfil · {profile.email}</p>
            <h1 id="who" className={`break-words pb-[.12em] font-display font-semibold leading-[.82] tracking-[-.03em] ${nameSize(profile.username)}`}>{profile.username}</h1>
            <p className="mt-2 text-ink-soft">{[profile.displayName, country, `Miembro desde ${monthYear.format(new Date(profile.createdAt))}`].filter(Boolean).join(' · ')}</p>
            {achievements.length > 0 && (
              <p className="font-display text-[22px] italic">
                {achievements.map((a, i) => <span key={a}>{i > 0 && <span aria-hidden="true" className="px-2.5 not-italic text-loss">·</span>}{a}</span>)}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-3">
              {actions}
              {onEdit && <Button variant="ghost" className="h-11! px-5! text-[15px]" onClick={onEdit}>Editar datos</Button>}
            </div>
          </div>
          <div className="max-w-full flex-[0_0_340px] animate-rise [animation-delay:.08s]" style={{ order: order.piece }}>
            <PieceShowcase />
          </div>
          <div className={`flex flex-[0_1_auto] flex-col gap-1.5 animate-rise [animation-delay:.14s] ${order.elo === 0 ? 'items-start text-left' : 'items-end text-right'}`}
            style={{ order: order.elo }}>
            <p className="eyebrow">ELO actual</p>
            <p className="font-display text-[clamp(96px,11vw,168px)] font-medium leading-[.9] tracking-[-.02em] text-accent nums">
              <CountUp to={profile.eloRating} from={Math.max(0, profile.eloRating - 200)} />
            </p>
            <p className="mt-5 text-[15px]">
              {delta === null ? <span className="text-ink-soft">Sin partidas en 30 días</span>
                : <><strong className="font-semibold text-accent">{delta >= 0 ? '▲ +' : '▼ '}{delta}</strong> en los últimos 30 días</>}
            </p>
          </div>
        </div>
      </section>

      <Performance profile={profile} {...bandProps('rend')} />
      <EloSection history={history} elo={profile.eloRating} delta={delta} {...bandProps('elo')} />
      <FormSection results={results} {...bandProps('forma')} />
      <NextSection elo={profile.eloRating} {...bandProps('next')} />
    </div>
  );
}

type BandProps = { tone: 'band' | 'paper'; style: { order: number }; className: string };

function Performance({ profile: { stats }, ...band }: { profile: Profile } & BandProps) {
  const played = stats.gamesPlayed;
  return (
    <Band labelledBy="rend" {...band}>
      <SectionTitle id="rend" lead={played ? `${played} partidas jugadas.` : 'Aún sin partidas.'}>Rendimiento.</SectionTitle>
      <dl className="mt-[52px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-10">
        <BigNumber label="victorias" className="text-accent"><CountUp to={stats.wins} /></BigNumber>
        <BigNumber label="derrotas"><CountUp to={stats.losses} /></BigNumber>
        <BigNumber label="de victorias">{played ? <CountUp to={stats.winRate} format={percent} /> : '—'}</BigNumber>
        <BigNumber label="precisión según el coach" className="text-loss">—</BigNumber>
      </dl>
      <div role="img" aria-label={`${stats.wins} victorias y ${stats.losses} derrotas`} className="mt-[52px] flex h-2 gap-1">
        {played ? (
          <>
            <span className="flex" style={{ flex: `${stats.wins} 1 0` }}><GrowBar className="block h-2 w-full rounded bg-accent" /></span>
            <span className="flex" style={{ flex: `${stats.losses + stats.draws} 1 0` }}><GrowBar className="block h-2 w-full rounded bg-loss" delay={.1} /></span>
          </>
        ) : <span className="h-2 flex-1 rounded bg-rule" />}
      </div>
    </Band>
  );
}

function EloSection({ history, elo, delta, ...band }: { history: EloPoint[]; elo: number; delta: number | null } & BandProps) {
  const [open, setOpen] = useState(false);
  const elos = history.map(p => p.elo);
  return (
    <Band labelledBy="evo" {...band}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
        <SectionTitle id="evo" lead={delta === null ? 'Aún sin partidas.' : (
          <><strong className="font-semibold text-accent">{delta >= 0 ? '+' : ''}{delta}</strong> en 30 días · máximo {Math.max(...elos)} · mínimo {Math.min(...elos)}</>
        )}>Evolución de Elo.</SectionTitle>
        <button type="button" aria-expanded={open} aria-controls="elo-panel" onClick={() => setOpen(o => !o)}
          className={`inline-flex h-12 items-center gap-2.5 rounded-full px-[22px] font-medium shadow-[inset_0_0_0_1px_var(--t-ink)] transition-colors ${open ? 'bg-ink text-paper' : 'hover:bg-band'}`}>
          <TrendingUp size={18} aria-hidden="true" /> {open ? 'Ocultar evolución' : 'Ver evolución'}
        </button>
      </div>
      {/* se abre con grid-template-rows 0fr → 1fr, sin medir alturas en JS; inert saca el contenido cerrado del Tab */}
      <div id="elo-panel" inert={!open}
        className={`grid transition-[grid-template-rows] duration-600 ease-(--ease-out) ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className={`pt-7 transition-opacity duration-400 ${open ? 'opacity-100' : 'opacity-0'}`}>
            <EloChart points={history} currentElo={elo} drawn={open} />
          </div>
        </div>
      </div>
    </Band>
  );
}

function FormSection({ results, ...band }: { results: GameResult[] } & BandProps) {
  let streak = 0;
  for (let i = results.length - 1; i >= 0 && results[i]!.result === 'win'; i--) streak++;
  return (
    <Band labelledBy="forma" {...band}>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <SectionTitle id="forma" lead={results.length ? (streak ? `Racha actual: ${streak} ${streak === 1 ? 'victoria' : 'victorias seguidas'}.` : 'Sin racha abierta.') : undefined}>
          {results.length ? `Últimas ${results.length} partidas.` : 'Últimas partidas.'}
        </SectionTitle>
        {results.length > 0 && (
          <p aria-hidden="true" className="flex gap-5 text-caption text-ink-soft">
            <span className="flex items-center gap-2"><i className="h-3.5 w-1 rounded-sm bg-accent" />Victoria</span>
            <span className="flex items-center gap-2"><i className="h-2 w-1 rounded-sm bg-loss" />Derrota</span>
          </p>
        )}
      </div>
      <ResultsStrip results={results} />
      {results.length > 0 && <Link href="/dashboard/partidas" className="mt-6 inline-block font-medium text-accent underline-offset-4 hover:underline">Ver todas tus partidas ›</Link>}
    </Band>
  );
}

function NextSection({ elo, ...band }: { elo: number } & BandProps) {
  return (
    <Band labelledBy="next" {...band}>
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="eyebrow">Siguiente partida</p>
        <h2 id="next" className="font-display text-[clamp(56px,7vw,88px)] font-semibold leading-none tracking-[-.02em]">¿Otra más?</h2>
        <p className="text-ink-soft">Te emparejamos con alguien cerca de tus <span className="nums">{elo}</span> puntos.</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-6">
          <Link href="/dashboard/play" className={buttonClass('primary')}>Buscar partida</Link>
          <span aria-disabled="true" title="Próximamente" className="text-muted">Ver ranking ›</span>
        </div>
      </div>
    </Band>
  );
}
