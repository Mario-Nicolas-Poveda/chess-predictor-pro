'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { framesOf } from '@/components/chess/replay';
import type { Color, EndReason } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { useBoardInput } from '../hooks/useBoardInput';
import { LocalGame, botDelay } from './localGame';

const START_MS = 10 * 60_000;   // 10 + 0
export type LocalResult = { winner: Color | null; reason: EndReason };

/** Partida contra el bot local, con relojes en el cliente. Juegas con blancas. Para /dev/arena. */
export function useLocalArena() {
  const [ucis, setUcis] = useState<string[]>([]);
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
    setNotice('');
    setUcis(u => [...u, uci]);
  }, [yourTurn, legal]);
  const input = useBoardInput(legal, play);

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

  return {
    frame, sans: frames.slice(1).map(f => f.san!), ucis, game, legal, yourTurn, result, clock, notice, ...input,
    offerDraw: () => { if (game.acceptsDraw()) setEnded({ winner: null, reason: 'agreement' }); else setNotice('bob_bot rechazó las tablas.'); },
    resign: () => setEnded({ winner: 'black', reason: 'resign' }),
    reset: () => { clearTimeout(timer.current); setUcis([]); input.clear(); setClock({ white: START_MS, black: START_MS }); setEnded(null); setNotice(''); },
  };
}
