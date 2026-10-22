'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { framesOf } from '@/components/chess/replay';
import { sanEs } from '@/components/chess/san';
import type { BoardView } from '@/components/three/scenes/gameBoardScene';
import { Button } from '@/components/ui/Button';
import { usePreferences } from '@/modules/dashboard/presentation/preferences/PreferencesProvider';
import { THEME_3D, accentHex } from '@/modules/dashboard/presentation/theme/themes';
import { TIME_CONTROL_LABEL } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { useBoardInput } from '../hooks/useBoardInput';
import { useClock } from '../hooks/useClock';
import { useGame } from '../hooks/useGame';
import { livePosition } from '../game/livePosition';
import { OUTCOME_TITLE, eloDelta, outcomeOf, reasonText } from '../reasons';
import { ArenaLayout } from './ArenaLayout';
import { EndBand } from './EndBand';
import { materialOf } from './PlayerStrip';
import { PromotionDialog } from './PromotionDialog';

const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const small = 'h-11! px-[18px]! text-sm';

/** /dashboard/arena/[matchId]: la partida en vivo contra la API (o el mock con NEXT_PUBLIC_API_MOCK=1). */
export function ArenaScreen() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const g = useGame(matchId);
  const { prefs } = usePreferences();
  const [flipped, setFlipped] = useState<boolean | null>(null);   // null = tu color
  const [confirming, setConfirming] = useState(false);

  const s = g.server;
  const ucis = useMemo(() => [...g.moves.map(m => m.uci), ...(g.optimistic ? [g.optimistic] : [])], [g.moves, g.optimistic]);
  const frames = useMemo(() => framesOf(ucis), [ucis]);
  const frame = frames[frames.length - 1]!;
  const canMove = g.yourTurn;
  // destinos con el fen del servidor (más la optimista); manda el servidor
  const fen = s?.fen;
  const legal = useMemo(() => (canMove && fen ? livePosition(fen, g.optimistic).moves({ verbose: true }) : []), [canMove, fen, g.optimistic]);
  const input = useBoardInput(legal, g.play);
  const clock = useClock(s?.clock, g.offset, g.reload, { paused: !!g.optimistic, tick: s?.status === 'pending' });

  const finished = s?.status === 'finished';
  useEffect(() => { if (finished) router.prefetch(`/dashboard/arena/${matchId}/resultado`); }, [finished, router, matchId]);

  if (g.error) return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-16 lg:px-10">
      <h1 className="font-display text-heading font-semibold">{g.error}</h1>
      <Link href="/dashboard/play" className="text-accent underline-offset-4 hover:underline">Ir a Jugar ›</Link>
    </div>
  );
  if (!s) return <p aria-busy="true" className="mx-auto max-w-[1240px] px-5 py-16 text-ink-soft lg:px-10">Cargando partida…</p>;
  if (s.status === 'aborted') return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-16 lg:px-10">
      <h1 className="font-display text-[clamp(48px,5vw,68px)] font-semibold leading-none tracking-[-.02em]">Partida cancelada.</h1>
      <p className="max-w-[460px] text-ink-soft">Nadie movió a tiempo o un jugador la canceló. No cuenta para el ELO.</p>
      <div><Button onClick={() => router.push('/dashboard/play')}>Buscar otra partida</Button></div>
    </div>
  );

  const you = s.yourColor, rivalColor = you === 'white' ? 'black' : 'white', rival = s.opponent.username;
  const sans = g.moves.map(m => m.san);
  const lastSan = sans.at(-1) ?? null, lastByYou = g.moves.length > 0 && g.moves.length % 2 === (you === 'white' ? 1 : 0);
  const outcome = s.result ? outcomeOf(s.result.winner, you) : null;
  const reason = s.result && outcome ? reasonText(s.result.reason, outcome, rival, s.ply, lastSan) : '';
  const pendingLeft = s.pendingExpiresAt ? Date.parse(s.pendingExpiresAt) - clock.serverNow : 0;
  const theirOffer = s.drawOffer === rivalColor, yourOffer = s.drawOffer === you;
  const playing = s.status === 'active' || s.status === 'pending';
  const orientation = (flipped ?? false) ? rivalColor : you;

  const title = outcome ? OUTCOME_TITLE[outcome]
    : s.status === 'pending' && s.turn !== you ? `Esperando a ${rival}…`
    : g.yourTurn ? (s.check ? '¡Jaque!' : 'Tu turno.') : `${rival} piensa…`;
  const sub = outcome ? reason
    : s.status === 'pending' && !g.optimistic ? (s.turn === you ? `Tienes ${mmss(pendingLeft)} para la primera jugada. El reloj arranca cuando muevas.` : `Las blancas tienen ${mmss(pendingLeft)} para empezar.`)
    : g.yourTurn ? (s.check ? 'Protege a tu rey.' : lastSan ? `${rival} jugó ${sanEs(lastSan)}.` : '')
    : g.optimistic ? 'Enviando tu jugada…'
    : lastSan ? `Jugaste ${sanEs(lastSan)}. Su reloj está corriendo.` : '';
  const live = outcome ? `${OUTCOME_TITLE[outcome]} ${reason}`
    : theirOffer ? `${rival} ofrece tablas.`
    : lastSan ? (lastByYou ? `Jugaste ${sanEs(lastSan)}.` : `${rival} jugó ${sanEs(lastSan)}. Tu turno.`) + (s.check ? ' Jaque.' : '') : '';
  const sync = g.offline ? 'Sin conexión. Reintentando…'
    : finished ? `Resultado guardado · ${Math.ceil(s.ply / 2)} jugadas`
    : g.yourTurn || s.status === 'pending' ? `En línea · sincronizado · jugada ${Math.ceil((s.ply + 1) / 2)}` : `En línea · esperando la jugada de ${rival}`;
  const t = TIME_CONTROL_LABEL[s.timeControl];

  const view: BoardView = {
    pieces: frame.pieces, captured: frame.captured, selected: input.selected, targets: input.targets, captures: input.captures, movable: input.movable,
    lastMove: frame.lastMove, check: finished ? null : frame.check, orientation,
    interactive: canMove && !input.promo, ended: finished,
    toppled: s.result?.winner ? (s.result.winner === 'white' ? 'black' : 'white') : null,
    colors: { ...THEME_3D[prefs.theme], accent: accentHex(prefs.theme, prefs.accent) },
  };
  const strip = (c: 'white' | 'black') => {
    const p = c === you ? s.you : s.opponent, mine = c === 'white' ? frame.captured.black : frame.captured.white;
    const theirs = c === 'white' ? frame.captured.white : frame.captured.black;
    return { name: p.username, elo: p.elo, color: c, you: c === you, thinking: c !== you && s.status === 'active' && s.turn === c,
      captured: mine, advantage: materialOf(mine) - materialOf(theirs), ms: clock[c], clockActive: s.clock.running === c };
  };

  const flip = (
    <button type="button" aria-pressed={orientation !== you} onClick={() => setFlipped(f => !f)}
      className="inline-flex h-11 items-center gap-2 rounded-full px-[18px] text-sm font-medium text-accent hover:bg-band">
      <RefreshCw size={18} aria-hidden="true" /> Girar tablero
    </button>
  );
  const actions = !playing ? <div className="flex flex-wrap gap-2.5">{flip}</div>
    : confirming ? (
      <div role="alertdialog" aria-labelledby="resign-q" className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 animate-rise">
        <p id="resign-q" className="basis-full text-[15px]">¿Rendirte? Perderías {-eloDelta(s.you.elo, s.opponent.elo, 0)} puntos de ELO.</p>
        <Button className={small} onClick={() => { setConfirming(false); void g.resign(); }}>Sí, rendirme</Button>
        <Button variant="ghost" className={small} onClick={() => setConfirming(false)}>Seguir jugando</Button>
      </div>
    ) : (
      <div className="flex flex-col gap-3.5">
        {theirOffer && (
          <div role="group" aria-label="Oferta de tablas" className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-2xl bg-band px-5 py-4 animate-rise">
            <p className="basis-full text-[15px]">{rival} ofrece tablas.</p>
            <Button className={small} onClick={() => void g.acceptDraw()}>Aceptar</Button>
            <Button variant="ghost" className={small} onClick={() => void g.declineDraw()}>Rechazar</Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2.5">
          {s.status === 'pending' ? (
            <Button variant="ghost" className={small} onClick={() => void g.cancel()}>Cancelar partida</Button>
          ) : yourOffer ? <>
            <Button variant="ghost" className={small} disabled>Tablas ofrecidas…</Button>
            <Button variant="ghost" className={small} onClick={() => void g.declineDraw()}>Retirar</Button>
          </> : (
            <Button variant="ghost" className={small} onClick={() => void g.offerDraw()} disabled={theirOffer}>Ofrecer tablas</Button>
          )}
          {s.status === 'active' && <Button variant="ghost" className={small} onClick={() => setConfirming(true)}>Rendirse</Button>}
          {flip}
        </div>
      </div>
    );

  return (
    <ArenaLayout
      eyebrow={`Partida · ${t.label} ${t.kind} · #${s.id.slice(0, 4)}`} title={title} titleAccent={s.check && g.yourTurn && !outcome} sub={sub}
      notice={playing ? g.notice : ''} live={live} sync={sync}
      rival={strip(rivalColor)} you={strip(you)}
      view={view} stageLabel={finished ? 'Posición final' : orientation === 'white' ? 'Vista desde las blancas' : 'Vista desde las negras'} onSquare={input.onSquare}
      sans={sans} legal={legal} canType={canMove && !input.promo} onPlay={input.play}
      overlay={input.promo ? <PromotionDialog color={you === 'white' ? 'w' : 'b'} onPick={input.promote} onCancel={input.cancelPromo} />
        : outcome && s.result && <EndBand title={OUTCOME_TITLE[outcome]} reason={reason}
          eloDelta={s.result.elo[you].after - s.result.elo[you].before}
          resultHref={`/dashboard/arena/${s.id}/resultado`} onAgain={() => router.push('/dashboard/play')} />}
      actions={actions} />
  );
}
