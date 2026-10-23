'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { ApiError } from '@/lib/apiClient';
import { ENGINE_LEVELS } from '@/modules/ai-engine/domain/levels';
import { AI_LEVEL_IDS, AI_TIME_CONTROLS, type AiLevel, type AiLevelsResponse, type AiTimeControl } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import { arenaApi } from '@/modules/arena/presentation/api/arenaApi';
import { aiApi } from '../api/aiApi';
import { AI_LOGIN, useAiLevels } from '../hooks/useAiLevels';
import { ActiveAiGameBanner } from './ActiveAiGameBanner';
import { LevelPedestal } from './LevelPedestal';
import { LevelPicker } from './LevelPicker';

type ColorChoice = 'white' | 'random' | 'black';
type Choice = { level: AiLevel; color: ColorChoice; timeControl: AiTimeControl; prediction: boolean };

const KEY = 'cpp:ai-lobby';
const COLORS: [ColorChoice, string, string][] = [
  ['white', 'Blancas', 'bg-paper ring-1 ring-ink/30'],
  ['random', 'Al azar', 'border-2 border-current bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)]'],
  ['black', 'Negras', 'bg-ink ring-1 ring-paper/60'],
];
const CLOCK: Record<AiTimeControl, string> = { none: 'Sin reloj', '10+0': '10 + 0', '5+0': '5 + 0' };

/** La última elección guardada, campo a campo si sigue siendo válida. */
export function loadChoice(raw: string | null, recommended: AiLevel): Choice {
  const base: Choice = { level: recommended, color: 'white', timeControl: 'none', prediction: true };
  try {
    const c = JSON.parse(raw ?? 'null') as Partial<Choice> | null;
    if (!c || typeof c !== 'object') return base;
    return {
      level: AI_LEVEL_IDS.includes(c.level as AiLevel) ? c.level! : base.level,
      color: COLORS.some(([id]) => id === c.color) ? c.color! : base.color,
      timeControl: AI_TIME_CONTROLS.includes(c.timeControl as AiTimeControl) ? c.timeControl! : base.timeControl,
      prediction: typeof c.prediction === 'boolean' ? c.prediction : base.prediction,
    };
  } catch { return base; }
}

/** /dashboard/ai: elegir nivel, color, reloj y predicción, y empezar. */
export function AiLobby() {
  const { data, error } = useAiLevels();
  return (
    <div className="mx-auto grid max-w-[1240px] gap-x-16 gap-y-8 px-5 pb-16 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:grid-rows-[auto_1fr] lg:px-10">
      <div className="flex min-w-0 flex-col gap-5">
        <p className="eyebrow">Contra la IA · un jugador</p>
        <h1 className="font-display text-[clamp(52px,6vw,76px)] font-semibold leading-[.98] tracking-[-.025em]">Elige a tu rival.</h1>
        <p className="max-w-[520px] text-ink-soft">Cinco niveles, del que deja piezas colgando al que no regala nada. Las partidas contra la IA no cambian tu ELO.</p>
        {error && <p role="alert" className="text-accent">{error}</p>}
        {!data && !error && <p aria-busy="true" className="text-ink-soft">Cargando niveles…</p>}
      </div>
      {data && <LobbyForm data={data} />}
    </div>
  );
}

// se monta cuando llegan los niveles (ya en el cliente): puede leer localStorage al crear el estado
function LobbyForm({ data }: { data: AiLevelsResponse }) {
  const router = useRouter();
  const [c, setC] = useState(() => { try { return loadChoice(localStorage.getItem(KEY), data.recommended); } catch { return loadChoice(null, data.recommended); } });
  const [active, setActive] = useState(data.activeGame?.matchId ?? null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {} }, [c]);

  const set = <K extends keyof Choice>(k: K, v: Choice[K]) => setC(prev => ({ ...prev, [k]: v }));
  const info = data.levels.find(l => l.level === c.level) ?? data.levels[0]!;
  const colorLabel = COLORS.find(([id]) => id === c.color)![1].toLowerCase();
  const detail = [`Profundidad ${info.depth}`, ENGINE_LEVELS[info.level].quiesce && 'sigue los cambios', `${(info.thinkMs / 1000).toLocaleString('es')} s`]
    .filter(Boolean).join(' · ');

  const start = async (resign?: string) => {
    setBusy(true); setNotice('');
    try {
      if (resign) await arenaApi.resign(resign);
      const { state } = await aiApi.create(c);   // 201
      router.push(`/dashboard/arena/${state.id}`);
    } catch (e) {
      setBusy(false);
      if (!(e instanceof ApiError)) return setNotice('No se pudo conectar. Reintenta.');
      if (e.status === 401) return router.replace(AI_LOGIN);
      if (e.code === 'AI_GAME_IN_PROGRESS') return setActive(String(e.meta?.matchId));
      if (e.status === 429) return setNotice(`Empezaste muchas partidas seguidas. Prueba en ${Math.max(1, Math.ceil(Number(e.meta?.retryAfterS ?? 60) / 60))} min.`);
      if (e.status === 400) console.error('[ia] crear partida: 400', e.fields);   // es un bug del front
      setNotice('No se pudo empezar la partida. Reintenta.');
    }
  };

  return (
    <>
      <div className="flex min-w-0 flex-col gap-6 lg:col-start-1">
        {active && <ActiveAiGameBanner matchId={active} busy={busy} onResignAndStart={() => start(active)} />}
        <LevelPicker levels={data.levels} value={c.level} recommended={data.recommended} onChange={l => set('level', l)} />
      </div>

      <section aria-labelledby="ai-level-name"
        className="flex min-w-0 flex-col gap-6 self-start rounded-[32px] bg-vellum p-5 shadow-[inset_0_0_0_1px_var(--t-rule)] lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <LevelPedestal level={info} />
        <div className="flex flex-col gap-1 px-1">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="ai-level-name" className="font-display text-[44px] font-semibold leading-none">{info.name}</h2>
            <span className="font-mono text-sm text-ink-soft nums">≈ {info.elo} ELO</span>
          </div>
          <p className="text-ink-soft">{detail}</p>
        </div>

        <Segmented legend="Juegas con" name="ai-color" value={c.color} onChange={v => set('color', v)}
          options={COLORS.map(([id, label, dot]) => [id, <><span aria-hidden="true" className={`size-4 shrink-0 rounded-full ${dot}`} />{label}</>])} />
        <Segmented legend="Reloj" name="ai-clock" value={c.timeControl} onChange={v => set('timeControl', v)}
          options={AI_TIME_CONTROLS.map(id => [id, CLOCK[id]])} />

        <div className="flex items-center justify-between gap-4 px-1">
          <div>
            <p className="font-medium">Mostrar predicción</p>
            <p className="text-[15px] text-ink-soft">Barra de ventaja y tus 3 mejores jugadas.</p>
          </div>
          <Switch checked={c.prediction} onChange={v => set('prediction', v)} label="Mostrar predicción" />
        </div>

        {notice && <p role="alert" className="px-1 text-accent">{notice}</p>}
        <div className="flex flex-col gap-2.5">
          <Button className="h-14! w-full text-lg" loading={busy && !active} disabled={busy} onClick={() => start()}>
            Empezar partida <ArrowRight size={20} aria-hidden="true" />
          </Button>
          <p className="text-center font-mono text-xs text-ink-faint">
            {info.name} · {colorLabel} · {CLOCK[c.timeControl].toLowerCase()} · predicción {c.prediction ? 'activada' : 'desactivada'}
          </p>
        </div>
      </section>
    </>
  );
}

/** Tres opciones en una píldora: radios nativos (← → cambian sin código extra). */
function Segmented<T extends string>({ legend, name, value, options, onChange }: {
  legend: string; name: string; value: T; options: [T, ReactNode][]; onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2.5 px-1 font-medium">{legend}</legend>
      <div className="grid grid-cols-3 gap-1 rounded-full bg-band p-1">
        {options.map(([id, label]) => (
          <label key={id} className="cursor-pointer">
            <input type="radio" name={name} value={id} checked={value === id} onChange={() => onChange(id)} className="peer sr-only" />
            <span className="flex h-12 items-center justify-center gap-2 rounded-full px-3 text-center transition-colors hover:bg-paper/60 peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
