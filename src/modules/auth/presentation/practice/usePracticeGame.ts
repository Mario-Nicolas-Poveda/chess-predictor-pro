'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Move } from 'chess.js';
import { movePieces, piecesFromFen } from '@/components/chess/pieces';
import { sanEs } from '@/components/chess/san';
import type { Square } from '@/components/chess/types';
import type { PracticeView } from '@/components/three/scenes/practiceScene';
import { CANDIDATES, FALLBACK_REPLIES, REPLIES, START_FEN, type Candidate } from './book';

const PIECE_NAME = { k: 'rey', q: 'dama', r: 'torre', b: 'alfil', n: 'caballo', p: 'peón' } as const;

const READY = 'Tu turno. Toca una pieza blanca.';
const OVER = 'Fin de la demo. Reinicia la posición.';

type Selection = { square: Square; targets: Square[]; captures: Square[] } | null;

// React manda: chess.js valida y este hook arma la vista que la escena dibuja.
export function usePracticeGame() {
  const [game] = useState(() => new Chess(START_FEN));
  const [pieces, setPieces] = useState(() => piecesFromFen(START_FEN));
  const [sel, setSel] = useState<Selection>(null);
  const [lastMove, setLastMove] = useState<[Square, Square] | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(READY);
  const [epoch, setEpoch] = useState(0);   // cambia al reiniciar: la escena vuelve a dejar caer las piezas
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const apply = useCallback((mv: Move) => {
    setPieces(p => movePieces(p, { from: mv.from as Square, to: mv.to as Square, promotion: mv.promotion }));
    setLastMove([mv.from as Square, mv.to as Square]);
    setHistory(h => [...h, mv.from + mv.to]);
  }, []);

  const reply = useCallback((key: string) => {
    const tryMove = (uci: string) => { try { return game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: 'q' }); } catch { return null; } };
    let mv: Move | null = null;
    for (const uci of [REPLIES[key], ...FALLBACK_REPLIES]) if (uci && (mv = tryMove(uci))) break;
    if (!mv) {
      const legal = game.moves({ verbose: true });
      const pick = legal[Math.floor(Math.random() * legal.length)];
      mv = pick ? tryMove(pick.from + pick.to) : null;
    }
    setBusy(false);
    if (!mv) { setStatus(OVER); return; }
    apply(mv);
    setStatus(game.isGameOver() ? OVER : `El rival respondió ${sanEs(mv.san)}. Tu turno.`);
  }, [game, apply]);

  const play = useCallback((from: string, to: string) => {
    let mv: Move;
    try { mv = game.move({ from, to, promotion: 'q' }); } catch { return; }   // chess.js lanza si es ilegal
    apply(mv);
    setSel(null);
    if (game.isGameOver()) { setStatus(OVER); return; }
    setBusy(true);
    setStatus(`Jugaste ${sanEs(mv.san)}. El rival piensa…`);
    timer.current = setTimeout(() => reply(from + to), 900);
  }, [game, apply, reply]);

  const onSquare = useCallback((sq: Square) => {
    if (busy) return;
    if (sel && (sel.targets.includes(sq) || sel.captures.includes(sq))) { play(sel.square, sq); return; }
    const p = game.get(sq);
    if (p?.color === 'w' && sel?.square !== sq) {
      const moves = game.moves({ square: sq, verbose: true });
      setSel({ square: sq, targets: moves.filter(m => !m.captured).map(m => m.to as Square), captures: moves.filter(m => m.captured).map(m => m.to as Square) });
      setStatus(`Elige casilla para tu ${PIECE_NAME[p.type]}.`);
    } else {
      setSel(null);
      if (!game.isGameOver()) setStatus(READY);
    }
  }, [busy, sel, game, play]);

  const candidates = useMemo(() => CANDIDATES[history.join(' ')] ?? [], [history]);
  const playCandidate = useCallback((c: Candidate) => { if (!busy) play(c.from, c.to); }, [busy, play]);

  const reset = useCallback(() => {
    clearTimeout(timer.current);
    game.load(START_FEN);
    setPieces(piecesFromFen(START_FEN));
    setSel(null); setLastMove(null); setHistory([]); setBusy(false); setStatus(READY);
    setEpoch(e => e + 1);
  }, [game]);

  const view = useMemo<PracticeView>(() => ({
    pieces, epoch, lastMove,
    selected: sel?.square ?? null, targets: sel?.targets ?? [], captures: sel?.captures ?? [],
    arrows: busy ? [] : candidates.map(c => ({ from: c.from as Square, to: c.to as Square, weight: c.pct / 100 })),
    interactive: !busy,
  }), [pieces, epoch, lastMove, sel, busy, candidates]);

  return { view, status, busy, candidates, onSquare, playCandidate, reset };
}
