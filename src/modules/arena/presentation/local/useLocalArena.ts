'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { framesOf } from '@/components/chess/replay';
import type { PieceType, Square } from '@/components/chess/types';
import type { Color, EndReason } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { LocalGame, botDelay } from './localGame';

const START_MS = 10 * 60_000;   // 10 + 0
export type LocalResult = { winner: Color | null; reason: EndReason };

/** Partida contra el bot local, con relojes en el cliente. Juegas con blancas. Para /dev/arena (y base de los mocks). */
export function useLocalArena() {
  const [ucis, setUcis] = useState<string[]>([]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [clock, setClock] = useState({ white: START_MS, black: START_MS });
  const [ended, setEnded] = useState<LocalResult | null>(null);   // final por tiempo, rendición o acuerdo
  const [notice, setNotice] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const game = useMemo(() => new LocalGame(ucis), [ucis]);
  const frames = useMemo(() => framesOf(ucis), [ucis]);
  const frame = frames[frames.length - 1]!;
  const result = ended ?? game.over();
  const yourTurn = !result && game.turn === 'white';
  const legal = useMemo(() => (yourTurn ? game.legal() : []), [game, yourTurn]);

  const play = useCallback((uci: string) => {
    if (!yourTurn || !legal.some(m => m.from + m.to + (m.promotion ?? '') === uci)) return;
    setSelected(null); setPromo(null); setNotice('');
    setUcis(u => [...u, uci]);
  }, [yourTurn, legal]);

  // turno del bot: contesta entre 650 y 1550 ms
  useEffect(() => {
    if (result || game.turn !== 'black') return;
    timer.current = setTimeout(() => { const u = game.botPick(); if (u) setUcis(prev => [...prev, u]); }, botDelay());
    return () => clearTimeout(timer.current);
  }, [game, result]);

  // relojes: corre el del turno (las blancas no arrancan hasta su primera jugada)
  useEffect(() => {
    if (result || ucis.length === 0) return;
    const side = game.turn;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now(), dt = now - last; last = now;
      setClock(c => {
        const left = Math.max(0, c[side] - dt);
        if (left === 0) setEnded({ winner: side === 'white' ? 'black' : 'white', reason: 'timeout' });
        return { ...c, [side]: left };
      });
    }, 200);
    return () => clearInterval(id);
  }, [game, result, ucis.length]);

  const onSquare = useCallback((sq: Square) => {
    if (!yourTurn) return;
    if (selected) {
      const hit = legal.filter(m => m.from === selected && m.to === sq);
      if (hit.length > 1) { setPromo({ from: selected, to: sq }); return; }   // las 4 coronaciones
      if (hit[0]) { play(hit[0].from + hit[0].to); return; }
    }
    setSelected(legal.some(m => m.from === sq) && sq !== selected ? sq : null);
  }, [yourTurn, selected, legal, play]);

  const moves = legal.filter(m => m.from === selected);
  return {
    frame, sans: frames.slice(1).map(f => f.san!), ucis, game, legal, yourTurn, result, clock, notice,
    selected, targets: moves.filter(m => !m.captured).map(m => m.to as Square), captures: moves.filter(m => m.captured).map(m => m.to as Square),
    movable: [...new Set(legal.map(m => m.from as Square))],
    promo, onSquare, play,
    promote: (t: PieceType) => promo && play(promo.from + promo.to + t),
    cancelPromo: () => setPromo(null),
    offerDraw: () => { if (game.acceptsDraw()) setEnded({ winner: null, reason: 'agreement' }); else setNotice('bob_bot rechazó las tablas.'); },
    resign: () => setEnded({ winner: 'black', reason: 'resign' }),
    reset: () => { clearTimeout(timer.current); setUcis([]); setSelected(null); setPromo(null); setClock({ white: START_MS, black: START_MS }); setEnded(null); setNotice(''); },
  };
}
