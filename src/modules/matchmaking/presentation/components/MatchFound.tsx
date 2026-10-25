'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as m from 'motion/react-m';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EASE_OUT } from '@/lib/motion';
import { TIME_CONTROL_LABEL, type MatchSummary, type PlayerSummary } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';

const COUNTDOWN = 5;

export function MatchFound({ match, onBack }: { match: MatchSummary; onBack: () => void }) {
  const router = useRouter();
  const href = `/dashboard/arena/${match.id}`;
  const [left, setLeft] = useState(COUNTDOWN);
  const tc = TIME_CONTROL_LABEL[match.timeControl];
  const youWhite = match.yourColor === 'white';

  useEffect(() => { router.prefetch(href); }, [router, href]);
  useEffect(() => {
    const id = setInterval(() => setLeft(n => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (left === 0) router.push(href); }, [left, router, href]);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2.5">
        <p className="eyebrow">{tc.label} · {tc.kind}</p>
        <h1 className="font-display text-[clamp(56px,6vw,84px)] font-semibold leading-none tracking-[-.025em]">Partida encontrada.</h1>
      </div>

      <div className="flex flex-col gap-3.5">
        <m.div initial={{ opacity: 0, x: -36 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .7, delay: .15, ease: EASE_OUT }}>
          <Player p={match.you} side={youWhite ? 'Blancas' : 'Negras'} tone="bg-ink" />
        </m.div>
        <m.span className="pl-[68px] font-display text-[30px] italic text-accent" style={{ originX: 0 }}
          initial={{ opacity: 0, scale: .6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .6, delay: .45, ease: EASE_OUT }}>
          vs
        </m.span>
        <m.div initial={{ opacity: 0, x: 36 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .7, delay: .3, ease: EASE_OUT }}>
          <Player p={match.opponent} side={youWhite ? 'Negras' : 'Blancas'} tone="bg-accent" />
        </m.div>
      </div>

      <div className="flex max-w-[420px] flex-col gap-3">
        <p aria-live="polite" className="text-[15px] text-ink-soft">Entrando a la arena en <strong className="text-ink nums">{left}</strong></p>
        <div className="h-1 overflow-hidden rounded-sm bg-rule">
          {/* una sola animación de 5 s */}
          <m.span className="block h-full bg-accent" style={{ originX: 0 }} initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: COUNTDOWN, ease: 'linear' }} />
        </div>
        <div className="mt-2 flex items-center gap-6">
          <Button onClick={() => router.push(href)}>Entrar ahora</Button>
          <Button variant="quiet" onClick={onBack}>Volver al lobby</Button>
        </div>
      </div>
    </div>
  );
}

function Player({ p, side, tone }: { p: PlayerSummary; side: string; tone: string }) {
  return (
    <div className="flex items-center gap-4">
      <Avatar user={p} size={52} className={`text-on-accent ${tone}`} />
      <span className="flex min-w-0 flex-col leading-[1.15]">
        <span className="truncate font-display text-4xl font-semibold">{p.username}</span>
        <span className="text-caption text-ink-soft">{side} · <span className="nums">{p.elo}</span></span>
      </span>
    </div>
  );
}
