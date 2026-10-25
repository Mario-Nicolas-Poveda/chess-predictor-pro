'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { framesOf } from '@/components/chess/replay';
import { sanEs } from '@/components/chess/san';
import { CountUp } from '@/components/motion/CountUp';
import { ThreeCanvas } from '@/components/three/ThreeCanvas';
import { useThreeScene } from '@/components/three/useThreeScene';
import { Button, buttonClass } from '@/components/ui/Button';
import type { AiTimeControl } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import { aiApi } from '@/modules/ai-engine/presentation/api/aiApi';
import { usePreferences } from '@/modules/dashboard/presentation/preferences/PreferencesProvider';
import { THEME_3D, accentHex } from '@/modules/dashboard/presentation/theme/themes';
import { TIME_CONTROL_LABEL } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { useRematch } from '../hooks/useRematch';
import { OUTCOME_TITLE, outcomeOf, reasonText } from '../reasons';
import { EloRail } from './EloRail';
import { RematchPanel } from './RematchPanel';

const loadScene = () => import('@/components/three/scenes/resultScene').then(mod => mod.createResultScene);
const COLOR = { white: 'blancas', black: 'negras' } as const;
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0');
const clockText = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
};
const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
function ago(iso: string, now: number) {
  const s = Math.round((Date.parse(iso) - now) / 1000);
  if (s > -60) return 'hace un momento';
  if (s > -3600) return rtf.format(Math.round(s / 60), 'minute');
  if (s > -86400) return rtf.format(Math.round(s / 3600), 'hour');
  return rtf.format(Math.round(s / 86400), 'day');
}

/** /dashboard/arena/[id]/resultado: título, cambio de ELO, datos, reyes en 3D y revancha. */
export function ResultScreen() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const r = useRematch(matchId);
  const [starting, setStarting] = useState(false);
  const s = r.state;
  const [now] = useState(() => Date.now());
  const frames = useMemo(() => framesOf(s ? s.moves.map(m => m.uci) : []), [s]);

  if (r.error) return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-16 lg:px-10">
      <h1 className="font-display text-heading font-semibold">{r.error}</h1>
      <Link href="/dashboard/play" className="text-accent underline-offset-4 hover:underline">Ir a Jugar ›</Link>
    </div>
  );
  if (!s?.result) return <p aria-busy="true" className="mx-auto max-w-[1240px] px-5 py-16 text-ink-soft lg:px-10">Cargando resultado…</p>;

  const you = s.yourColor, rivalColor = you === 'white' ? 'black' : 'white', ai = s.ai;
  const rival = ai ? 'La IA' : s.opponent.username;
  // contra la IA: otra partida con la misma configuración (201); si falla, a elegir nivel
  const again = async () => {
    if (!ai) return;
    setStarting(true);
    try {
      const { state } = await aiApi.create({ level: ai.level, color: you, timeControl: s.timeControl as AiTimeControl, prediction: ai.prediction });
      router.push(`/dashboard/arena/${state.id}`);
    } catch { router.push('/dashboard/ai'); }
  };
  const outcome = outcomeOf(s.result.winner, you);
  const lastSan = s.moves.at(-1)?.san ?? null;
  const mine = s.result.elo[you], theirs = s.result.elo[rivalColor];
  const delta = mine.after - mine.before, theirDelta = theirs.after - theirs.before;
  const captured = frames[frames.length - 1]!.captured[rivalColor].length;   // piezas del rival que capturaste
  const t = TIME_CONTROL_LABEL[s.timeControl];
  const stats = [
    { n: String(Math.ceil(s.ply / 2)), label: Math.ceil(s.ply / 2) === 1 ? 'jugada' : 'jugadas' },
    { n: s.startedAt && s.endedAt ? clockText(Date.parse(s.endedAt) - Date.parse(s.startedAt)) : '0:00', label: 'de partida' },
    { n: String(captured), label: captured === 1 ? 'pieza capturada' : 'piezas capturadas' },
    ...(s.timeControl !== 'none' ? [{ n: clockText(s.clock[you === 'white' ? 'whiteMs' : 'blackMs']), label: 'quedó en tu reloj' }] : []),
  ];
  const fallen = s.result.winner ? (s.result.winner === 'white' ? 'negro' : 'blanco') : null;
  const caption = [lastSan && sanEs(lastSan), fallen ? `El rey ${fallen} cae` : 'Los reyes se saludan'].filter(Boolean).join(' · ');

  return (
    <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-16 gap-y-10 px-5 pb-16 pt-8 lg:px-10">
      <section aria-labelledby="result-title" className="flex min-w-0 flex-[1_1_460px] flex-col gap-7 animate-rise">
        <div className="flex flex-col gap-4">
          <p className="eyebrow">Partida terminada · {ai ? `contra la IA · ${ai.name}` : `${t.label} ${t.kind}`} · {s.endedAt ? ago(s.endedAt, now) : ''}</p>
          <h1 id="result-title" className="font-display text-[clamp(88px,10vw,148px)] font-semibold leading-[.9] tracking-[-.025em]">{OUTCOME_TITLE[outcome]}</h1>
          <p className="font-display text-[28px] italic leading-tight">{reasonText(s.result.reason, outcome, rival, s.ply, lastSan)}</p>
          <p className="text-ink-soft">{s.you.username} con {COLOR[you]} contra {ai ? `la IA · ${ai.name}` : rival} con {COLOR[rivalColor]}.</p>
        </div>

        {ai ? <p className="text-lg text-ink-soft">Contra la IA no cambia tu ELO.</p> : <div className="flex max-w-[520px] flex-col gap-4">
          <p className="eyebrow">Tu ELO</p>
          <div className="flex items-end gap-5">
            <CountUp from={mine.before} to={mine.after} duration={1.3} delay={.5}
              className="font-display text-[clamp(88px,9vw,124px)] font-semibold leading-[.8] text-accent nums" />
            <span className={`mb-2 rounded-full px-4 py-2 font-mono text-lg font-medium nums ${delta > 0 ? 'bg-accent text-on-accent' : 'bg-band text-ink'}`}>{signed(delta)} ELO</span>
          </div>
          <EloRail before={mine.before} after={mine.after} />
          <p className="text-ink-soft nums">
            Antes {mine.before} · ahora {mine.after} · {rival} {theirs.before} → {theirs.after} ({signed(theirDelta)})
          </p>
        </div>}

        <dl className="grid max-w-[620px] grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-6">
          {stats.map(x => (
            <div key={x.label} className="flex flex-col-reverse justify-end gap-1">
              <dt className="text-ink-soft">{x.label}</dt>
              <dd className="font-display text-[48px] font-semibold leading-none nums">{x.n}</dd>
            </div>
          ))}
        </dl>

        {ai ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button loading={starting} onClick={() => void again()}>Jugar otra vez</Button>
            <Link href="/dashboard/ai" className={buttonClass('ghost')}>Elegir otro nivel</Link>
            <Link href={`/dashboard/partidas/${s.id}`} className="inline-flex h-12 items-center px-2 font-medium text-accent underline-offset-4 hover:underline">Ver la partida ›</Link>
          </div>
        ) : <RematchPanel view={r.view} rival={rival} nextColor={COLOR[rivalColor]} busy={r.busy} matchId={s.id} onRequest={r.request} onCancel={r.cancel} />}
      </section>

      <KingsStage outcome={outcome} you={you} caption={caption} fallenColor={s.result.winner ? (s.result.winner === 'white' ? 'black' : 'white') : null} />
    </div>
  );
}

/** Escenario de los reyes; sin WebGL, los dos glifos con el que pierde girado. */
function KingsStage({ outcome, you, caption, fallenColor }: { outcome: 'win' | 'loss' | 'draw'; you: 'white' | 'black'; caption: string; fallenColor: 'white' | 'black' | null }) {
  const { canvasRef, scene, failed } = useThreeScene(loadScene);
  const { prefs } = usePreferences();
  useEffect(() => { scene?.setTheme(THEME_3D[prefs.theme], accentHex(prefs.theme, prefs.accent)); }, [scene, prefs.theme, prefs.accent]);
  useEffect(() => { scene?.play(outcome, you); }, [scene, outcome, you]);

  const footer = (
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 px-[22px] pb-4">
      <p className="font-mono text-[11px] uppercase tracking-[.14em] text-ink-faint">{caption}</p>
      {!failed && <button type="button" onClick={() => scene?.play(outcome, you)} className="h-11 rounded-full px-2 font-medium text-accent hover:underline">Repetir animación</button>}
    </div>
  );
  if (failed) return (
    <div role="img" aria-label={caption} className="relative flex aspect-square min-w-0 flex-[1_1_420px] items-center justify-center gap-6 rounded-[28px] bg-band font-chess text-[120px] leading-none">
      <span className={fallenColor === 'white' ? 'rotate-90' : ''}>♔</span>
      <span className={fallenColor === 'black' ? 'rotate-90' : ''}>♚</span>
      {footer}
    </div>
  );
  return (
    <ThreeCanvas ref={canvasRef} ready={!!scene} className="aspect-square min-w-0 flex-[1_1_420px] rounded-[28px] bg-band">
      {footer}
    </ThreeCanvas>
  );
}
