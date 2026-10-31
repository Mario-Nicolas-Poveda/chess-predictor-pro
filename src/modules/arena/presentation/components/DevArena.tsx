'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { sanEs } from '@/components/chess/san';
import type { BoardView } from '@/components/three/scenes/gameBoardScene';
import { Button } from '@/components/ui/Button';
import { ACCENT_HEX, THEME_3D } from '@/modules/dashboard/presentation/theme/themes';
import { useLocalArena } from '../local/useLocalArena';
import { OUTCOME_TITLE, eloDelta, outcomeOf, reasonText } from '../reasons';
import { ArenaLayout } from './ArenaLayout';
import { EndBand } from './EndBand';
import { materialOf } from './PlayerStrip';
import { PromotionDialog } from './PromotionDialog';

const YOU = { name: 'alice', elo: 1450 }, BOT = { name: 'bob_bot', elo: 1478 };
const COLORS = { tileL: THEME_3D.pergamino.tileL, tileD: THEME_3D.pergamino.tileD, frame: THEME_3D.pergamino.frame, soft: THEME_3D.pergamino.soft, accent: ACCENT_HEX.vino.light };

/** /dev/arena: la arena completa contra el bot local, sin backend (juegas con blancas, 10 + 0). */
export function DevArena() {
  const a = useLocalArena();
  const [flipped, setFlipped] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const outcome = a.result ? outcomeOf(a.result.winner, 'white') : null;
  const lastSan = a.sans[a.sans.length - 1] ?? null;
  const reason = a.result && outcome ? reasonText(a.result.reason, outcome, BOT.name, a.sans.length, lastSan) : '';
  const check = !!a.frame.check;

  const view: BoardView = {
    pieces: a.frame.pieces, captured: a.frame.captured, selected: a.selected, targets: a.targets, captures: a.captures, movable: a.movable,
    lastMove: a.frame.lastMove, check: a.result ? null : a.frame.check, orientation: flipped ? 'black' : 'white',
    interactive: a.yourTurn && !a.promo, ended: !!a.result,
    toppled: a.result?.winner ? (a.result.winner === 'white' ? 'black' : 'white') : null, colors: COLORS,
  };
  const title = outcome ? OUTCOME_TITLE[outcome] : a.yourTurn ? (check ? '¡Jaque!' : 'Tu turno.') : `${BOT.name} piensa…`;
  const sub = outcome ? reason : a.yourTurn ? (check ? 'Protege a tu rey.' : lastSan ? `${BOT.name} jugó ${sanEs(lastSan)}.` : 'Las blancas empiezan. El reloj arranca cuando muevas.')
    : `Jugaste ${sanEs(lastSan ?? '')}. Su reloj está corriendo.`;
  const live = outcome ? `${OUTCOME_TITLE[outcome]} ${reason}` : a.yourTurn && lastSan ? `${BOT.name} jugó ${sanEs(lastSan)}. Tu turno.${check ? ' Jaque.' : ''}` : '';
  const score = outcome === 'win' ? 1 : outcome === 'draw' ? .5 : 0;

  return (
    <ArenaLayout
      eyebrow="Partida · 10 + 0 Rápida · demo local" title={title} titleAccent={check && !outcome} sub={sub} notice={a.notice} live={live}
      sync={outcome ? `Partida local terminada · ${Math.ceil(a.sans.length / 2)} jugadas` : `Contra el bot local · jugada ${Math.ceil((a.sans.length + 1) / 2)}`}
      rival={{ ...BOT, color: 'black', thinking: !a.result && !a.yourTurn, captured: a.frame.captured.white,
        advantage: materialOf(a.frame.captured.white) - materialOf(a.frame.captured.black), ms: a.clock.black, clockActive: !a.result && !a.yourTurn && a.sans.length > 0 }}
      you={{ ...YOU, color: 'white', you: true, captured: a.frame.captured.black,
        advantage: materialOf(a.frame.captured.black) - materialOf(a.frame.captured.white), ms: a.clock.white, clockActive: !a.result && a.yourTurn && a.sans.length > 0 }}
      view={view} stageLabel={a.result ? 'Posición final' : flipped ? 'Vista desde las negras' : 'Vista desde las blancas'} onSquare={a.onSquare}
      sans={a.sans} legal={a.legal} canType={a.yourTurn && !a.promo} onPlay={a.play}
      overlay={a.promo ? <PromotionDialog color="w" onPick={a.promote} onCancel={a.cancelPromo} />
        : outcome && <EndBand title={OUTCOME_TITLE[outcome]} reason={reason} eloDelta={eloDelta(YOU.elo, BOT.elo, score)} onAgain={a.reset} />}
      actions={confirming && !a.result ? (
        <div role="alertdialog" aria-labelledby="resign-q" className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 animate-rise">
          <p id="resign-q" className="basis-full text-[15px]">¿Rendirte? Perderías {-eloDelta(YOU.elo, BOT.elo, 0)} puntos de ELO.</p>
          <Button className="h-11! px-5! text-sm" onClick={() => { setConfirming(false); a.resign(); }}>Sí, rendirme</Button>
          <Button variant="ghost" className="h-11! px-[18px]! text-sm" onClick={() => setConfirming(false)}>Seguir jugando</Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {!a.result && <>
            <Button variant="ghost" className="h-11! px-[18px]! text-sm" onClick={a.offerDraw} disabled={a.sans.length === 0}>Ofrecer tablas</Button>
            <Button variant="ghost" className="h-11! px-[18px]! text-sm" onClick={() => setConfirming(true)}>Rendirse</Button>
          </>}
          <button type="button" aria-pressed={flipped} onClick={() => setFlipped(f => !f)}
            className="inline-flex h-11 items-center gap-2 rounded-full px-[18px] text-sm font-medium text-accent hover:bg-band">
            <RefreshCw size={18} aria-hidden="true" /> Girar tablero
          </button>
        </div>
      )} />
  );
}
