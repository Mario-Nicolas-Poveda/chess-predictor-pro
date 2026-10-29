'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { RefreshCw, Undo2 } from 'lucide-react';
import { glyph } from '@/components/chess/glyphs';
import type { Square } from '@/components/chess/types';
import { framesOf } from '@/components/chess/replay';
import { useFocusMode } from '@/components/layout/FocusMode';
import { sanEs } from '@/components/chess/san';
import type { BoardView } from '@/components/three/scenes/gameBoardScene';
import { Button } from '@/components/ui/Button';
import { AI_LEVELS, type AiTimeControl } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import { aiApi } from '@/modules/ai-engine/presentation/api/aiApi';
import { usePreferences } from '@/modules/dashboard/presentation/preferences/PreferencesProvider';
import { THEME_3D, accentHex } from '@/modules/dashboard/presentation/theme/themes';
import { TIME_CONTROL_LABEL } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { useBoardInput } from '../hooks/useBoardInput';
import { useClock } from '../hooks/useClock';
import { useGame } from '../hooks/useGame';
import { usePrediction } from '../hooks/usePrediction';
import { useRevealed } from '../hooks/useRevealed';
import { exitCopy, useArenaPanel } from '../game/arenaPanel';
import { livePosition } from '../game/livePosition';
import { OUTCOME_TITLE, eloDelta, outcomeOf, reasonText } from '../reasons';
import { ArenaHeader } from './ArenaHeader';
import { ArenaLayout } from './ArenaLayout';
import { EndBand } from './EndBand';
import { ExitDialog } from './ExitDialog';
import { materialOf } from './PlayerStrip';
import { EvalBar, PredictionPanel } from './PredictionPanel';
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
  const [exiting, setExiting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [say, setSay] = useState('');                                                // avisos para el lector (pista, deshacer)
  const [hover, setHover] = useState<string | null>(null);                           // candidata bajo el cursor o con foco
  const [pinned, setPinned] = useState<{ ply: number; uci: string } | null>(null);   // candidata fija (tocar)
  const [hint, setHint] = useState<{ ply: number; uci: string } | null>(null);       // pista con la predicción apagada

  const s = g.server;
  const ucis = useMemo(() => [...g.moves.map(m => m.uci), ...(g.optimistic ? [g.optimistic] : [])], [g.moves, g.optimistic]);
  const frames = useMemo(() => framesOf(ucis), [ucis]);
  // las jugadas que llegan juntas (la tuya y la de la IA) se ven de una en una
  const shown = useRevealed(ucis.length);
  const ready = shown === ucis.length;
  const frame = frames[shown]!;
  const canMove = g.yourTurn && ready;
  // destinos con el fen del servidor (más la optimista); manda el servidor
  const fen = s?.fen;
  const legal = useMemo(() => (canMove && fen ? livePosition(fen, g.optimistic).moves({ verbose: true }) : []), [canMove, fen, g.optimistic]);
  const input = useBoardInput(legal, g.play);
  const clock = useClock(s?.clock, g.offset, g.reload, { paused: !!g.optimistic, tick: s?.status === 'pending' });

  const finished = s?.status === 'finished';
  // modo enfoque: sin menú de módulos mientras se juega; vuelve al terminar
  useFocusMode(s?.status === 'pending' || s?.status === 'active');
  const panel = useArenaPanel(s?.status);
  const pred = usePrediction(matchId, s, !!s?.ai?.prediction);
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

  const you = s.yourColor, rivalColor = you === 'white' ? 'black' : 'white', ai = s.ai;
  const rival = ai ? 'La IA' : s.opponent.username, rivalLow = ai ? 'la IA' : rival;
  const hasClock = s.timeControl !== 'none';
  const yourTurn = canMove;   // con la jugada de la IA aún por mostrar, todavía no
  const sans = g.moves.slice(0, shown).map(m => m.san);
  const lastSan = sans.at(-1) ?? null, lastByYou = sans.length > 0 && sans.length % 2 === (you === 'white' ? 1 : 0);
  const outcome = s.result ? outcomeOf(s.result.winner, you) : null;
  const reason = s.result && outcome ? reasonText(s.result.reason, outcome, rival, s.ply, lastSan) : '';
  const pendingLeft = s.pendingExpiresAt ? Date.parse(s.pendingExpiresAt) - clock.serverNow : 0;
  const theirOffer = s.drawOffer === rivalColor, yourOffer = s.drawOffer === you;
  const playing = s.status === 'active' || s.status === 'pending';
  const orientation = (flipped ?? false) ? rivalColor : you;

  const title = outcome ? OUTCOME_TITLE[outcome]
    : s.status === 'pending' && s.turn !== you ? `Esperando a ${rival}…`
    : yourTurn ? (frame.check ? '¡Jaque!' : 'Tu turno.') : `${rival} piensa…`;
  const sub = outcome ? reason
    : s.status === 'pending' && !g.optimistic && hasClock ? (s.turn === you ? `Tienes ${mmss(pendingLeft)} para la primera jugada. El reloj arranca cuando muevas.` : `Las blancas tienen ${mmss(pendingLeft)} para empezar.`)
    : yourTurn ? (frame.check ? 'Protege a tu rey.' : lastSan ? `${rival} jugó ${sanEs(lastSan)}.` : ai ? `Juegas con ${you === 'white' ? 'blancas' : 'negras'}.` : '')
    : g.optimistic ? 'Enviando tu jugada…'
    : lastSan ? `Jugaste ${sanEs(lastSan)}.${hasClock ? ' Su reloj está corriendo.' : ''}` : '';
  const live = say || (outcome ? `${OUTCOME_TITLE[outcome]} ${reason}`
    : theirOffer ? `${rival} ofrece tablas.`
    : lastSan ? (lastByYou ? `Jugaste ${sanEs(lastSan)}.` : `${rival} jugó ${sanEs(lastSan)}. Tu turno.`) + (frame.check ? ' Jaque.' : '') : '');
  const sync = g.offline ? 'Sin conexión. Reintentando…'
    : finished ? `Resultado guardado · ${Math.ceil(s.ply / 2)} jugadas`
    : g.onAir ? `En vivo · jugada ${Math.ceil((s.ply + 1) / 2)}`
    : yourTurn || s.status === 'pending' ? `En línea · sincronizado · jugada ${Math.ceil((s.ply + 1) / 2)}` : `En línea · esperando la jugada de ${rivalLow}`;
  const t = TIME_CONTROL_LABEL[s.timeControl];

  // flechas: la pista manda; si no, la candidata fija o la que está bajo el cursor (solo en tu turno y de esta posición)
  const top = yourTurn ? pred.prediction?.top ?? [] : [];
  const candidate = (pinned?.ply === s.ply ? pinned.uci : null) ?? (top.some(m => m.uci === hover) ? hover : null);
  const arrowOf = (uci: string, tone: 'hint' | 'candidate') => ({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, tone });
  const arrows = hint?.ply === s.ply && yourTurn ? [arrowOf(hint.uci, 'hint')] : candidate && top.length ? [arrowOf(candidate, 'candidate')] : [];
  const yourMoves = you === 'white' ? Math.ceil(s.ply / 2) : Math.floor(s.ply / 2);

  const askHint = async () => {
    try {
      const r = await aiApi.prediction(matchId, null);
      const best = r === 'not-modified' ? null : r.prediction.top[0];
      if (!best) return g.say('No hay pista para esta posición.');
      const text = `Pista: ${sanEs(best.san)}.`;
      setHint({ ply: s.ply, uci: best.uci }); setSay(text); g.say(text);
    } catch { g.say('No se pudo pedir la pista. Reintenta.'); }
  };
  const undo = async () => { if (await g.undo()) setSay('Deshiciste tu última jugada.'); };
  // contra la IA, "Jugar otra vez" repite la configuración (201 → la nueva partida); si algo falla, a elegir nivel
  const again = async () => {
    if (!ai) return router.push('/dashboard/play');
    try {
      const { state } = await aiApi.create({ level: ai.level, color: you, timeControl: s.timeControl as AiTimeControl, prediction: ai.prediction });
      router.push(`/dashboard/arena/${state.id}`);
    } catch { router.push('/dashboard/ai'); }
  };

  const view: BoardView = {
    pieces: frame.pieces, captured: frame.captured, selected: input.selected, targets: input.targets, captures: input.captures, movable: input.movable,
    lastMove: frame.lastMove, check: finished ? null : frame.check, orientation,
    interactive: canMove && !input.promo, ended: finished,
    toppled: s.result?.winner ? (s.result.winner === 'white' ? 'black' : 'white') : null,
    colors: { ...THEME_3D[prefs.theme], accent: accentHex(prefs.theme, prefs.accent) }, arrows,
  };
  const strip = (c: 'white' | 'black') => {
    const p = c === you ? s.you : s.opponent, mine = c === 'white' ? frame.captured.black : frame.captured.white;
    const theirs = c === 'white' ? frame.captured.white : frame.captured.black;
    const level = ai && c !== you ? AI_LEVELS.find(l => l.level === ai.level) : undefined;
    return { name: ai && c !== you ? `IA · ${ai.name}` : p.username, avatarUrl: p.avatarUrl, elo: p.elo, color: c, you: c === you, glyph: level && glyph(level.piece, 'w'),
      thinking: c !== you && s.status === 'active' && (s.turn === c || !ready),
      captured: mine, advantage: materialOf(mine) - materialOf(theirs), ...(hasClock && { ms: clock[c], clockActive: s.clock.running === c }) };
  };

  const pill = panel.open ? null
    : input.promo ? 'Corona tu peón'
    : yourTurn ? (frame.check ? '¡Jaque!' : 'Tu turno')
    : s.status === 'pending' && s.turn !== you ? `Esperando a ${rival}…`
    : s.ai ? 'La IA piensa…' : `${rival} piensa…`;
  const exit = exitCopy(s);
  const leave = async () => {
    setLeaving(true);
    if (exit.action === 'cancel') await g.cancel();   // 204 → a Jugar (o a Contra la IA)
    else await g.resign();                            // 200 → se ve el final
    setLeaving(false); setExiting(false);
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
        <p id="resign-q" className="basis-full text-[15px]">{ai ? '¿Rendirte? La partida queda como derrota en tu historial.' : `¿Rendirte? Perderías ${-eloDelta(s.you.elo, s.opponent.elo, 0)} puntos de ELO.`}</p>
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
          {ai ? <>
            <Button variant="ghost" className={small} disabled={!yourTurn || !!g.optimistic || yourMoves === 0} onClick={() => void undo()}>
              <Undo2 size={18} aria-hidden="true" /> Deshacer
            </Button>
            {!ai.prediction && <Button variant="ghost" className={small} disabled={!yourTurn} onClick={() => void askHint()}>Pista</Button>}
            {s.status === 'pending' && <Button variant="ghost" className={small} onClick={() => void g.cancel()}>Cancelar partida</Button>}
          </> : s.status === 'pending' ? (
            <Button variant="ghost" className={small} onClick={() => void g.cancel()}>Cancelar partida</Button>
          ) : yourOffer ? <>
            <Button variant="ghost" className={small} disabled>Tablas ofrecidas…</Button>
            <Button variant="ghost" className={small} onClick={() => void g.declineDraw()}>Retirar</Button>
          </> : (
            <Button variant="ghost" className={small} onClick={() => void g.offerDraw()} disabled={theirOffer}>Ofrecer tablas</Button>
          )}
          {s.status === 'active' && <Button variant="ghost" className={small} onClick={() => setConfirming(true)}>Rendirse</Button>}
        </div>
      </div>
    );

  return (<>
    {playing && (
      <ArenaHeader label={s.ai ? `Contra la IA · ${s.ai.name} · nivel ${s.ai.level}` : `Partida en vivo · ${t.label} ${t.kind}`}
        pill={pill} pillAccent={pill === '¡Jaque!'} flipped={orientation !== you} onFlip={() => setFlipped(f => !f)}
        panelOpen={panel.open} onTogglePanel={panel.toggle} onExit={() => setExiting(true)} />
    )}
    <ArenaLayout panelOpen={panel.open}
      eyebrow={ai ? `Contra la IA · ${ai.name} · ${t.label.toLowerCase()}` : `Partida · ${t.label} ${t.kind} · #${s.id.slice(0, 4)}`}
      title={title} titleAccent={!!frame.check && yourTurn && !outcome} sub={sub}
      evalBar={ai?.prediction && <EvalBar white={pred.latest?.white ?? .5} fromBottom={orientation === 'white'} />}
      prediction={ai?.prediction && playing && !pred.failed && (
        <PredictionPanel prediction={pred.prediction} yourTurn={yourTurn} pinned={pinned?.ply === s.ply ? pinned.uci : null}
          onHover={setHover} onPin={uci => setPinned(p => (p?.ply === s.ply && p.uci === uci ? null : { ply: s.ply, uci }))} />
      )}
      notice={playing ? g.notice : ''} live={live} sync={sync} syncLive={g.onAir && !finished}
      rival={strip(rivalColor)} you={strip(you)}
      view={view} stageLabel={finished ? 'Posición final' : orientation === 'white' ? 'Vista desde las blancas' : 'Vista desde las negras'} onSquare={input.onSquare}
      sans={sans} legal={legal} canType={canMove && !input.promo} onPlay={input.play}
      overlay={input.promo ? <PromotionDialog color={you === 'white' ? 'w' : 'b'} onPick={input.promote} onCancel={input.cancelPromo} />
        : outcome && s.result && ready && <EndBand title={OUTCOME_TITLE[outcome]} reason={reason}
          eloDelta={s.result.elo[you].after - s.result.elo[you].before} note={ai ? 'contra la IA no cambia tu ELO' : undefined}
          link={ai ? { href: '/dashboard/ai', label: 'Elegir otro nivel' } : { href: `/dashboard/arena/${s.id}/resultado`, label: 'Ver resultado ›' }}
          onAgain={() => void again()} />}
      actions={actions} />
    {playing && <ExitDialog open={exiting} text={exit.text} confirm={exit.confirm} busy={leaving} onConfirm={() => void leave()} onClose={() => setExiting(false)} />}
  </>);
}
