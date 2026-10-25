import { PIECE_NAME, PIECE_VALUE, glyph } from '@/components/chess/glyphs';
import type { PieceType } from '@/components/chess/types';
import { Avatar } from '@/components/ui/Avatar';

const ORDER: PieceType[] = ['q', 'r', 'b', 'n', 'p'];
const typeOf = (id: string) => id[1] as PieceType;
export const materialOf = (ids: string[]) => ids.reduce((a, id) => a + PIECE_VALUE[typeOf(id)], 0);

const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const words = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60), r = s % 60;
  return [m && `${m} ${m === 1 ? 'minuto' : 'minutos'}`, `${r} ${r === 1 ? 'segundo' : 'segundos'}`].filter(Boolean).join(' ');
};

/** Reloj: activo en tinta; con menos de 30 s, en el acento; inactivo, apagado. */
export function ClockFace({ ms, active }: { ms: number; active: boolean }) {
  const tone = !active ? 'bg-band text-ink-soft' : ms < 30_000 ? 'bg-accent text-on-accent' : 'bg-ink text-paper';
  return (
    <span role="timer" aria-label={`Reloj: ${words(ms)}`}
      className={`min-w-28 shrink-0 rounded-xl px-4 py-2 text-right font-mono text-[28px] font-medium leading-none nums transition-colors ${tone}`}>
      {mmss(ms)}
    </span>
  );
}

/** Piezas que capturó este jugador (del color rival), de mayor a menor, y su ventaja de material. */
export function CapturedRow({ ids, color, advantage }: { ids: string[]; color: 'w' | 'b'; advantage: number }) {
  const sorted = [...ids].sort((a, b) => ORDER.indexOf(typeOf(a)) - ORDER.indexOf(typeOf(b)));
  const names = sorted.map(id => PIECE_NAME[typeOf(id)]);
  return (
    <span aria-label={names.length ? `Capturó ${names.join(', ')}` : 'Sin capturas'}
      className="min-w-0 flex-auto overflow-hidden whitespace-nowrap font-chess text-xl tracking-[-2px] text-ink">
      <span aria-hidden="true">{sorted.map(id => glyph(typeOf(id), color)).join('')}</span>
      {advantage > 0 && <span aria-hidden="true" className="ml-2 font-mono text-xs tracking-normal text-ink-faint">+{advantage}</span>}
    </span>
  );
}

type Props = {
  name: string; avatarUrl?: string | null; elo: number; color: 'white' | 'black'; you?: boolean; thinking?: boolean;
  glyph?: string;      // contra la IA: la pieza del nivel en el círculo y el ELO aproximado
  captured: string[]; advantage: number; ms?: number; clockActive?: boolean;   // sin ms (repetición) no hay reloj
};

export function PlayerStrip({ name, avatarUrl = null, elo, color, you, thinking, glyph, captured, advantage, ms, clockActive }: Props) {
  return (
    // tu franja es siempre la de abajo; el lector de pantalla oye cuál es la tuya
    <div role="group" aria-label={you ? `Tú: ${name}, ELO ${elo}, ${color === 'white' ? 'blancas' : 'negras'}` : undefined} className="flex min-h-[52px] items-center gap-3.5">
      {glyph
        ? <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-ink font-chess text-xl text-paper">{glyph}</span>
        : <Avatar user={{ username: name, avatarUrl }} size={40} className={you ? 'bg-ink text-paper' : 'bg-band text-ink'} />}
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-semibold">
          {name} {thinking && <span className="text-caption font-normal text-ink-faint">· piensa…</span>}
        </span>
        <span className="font-mono text-xs text-ink-faint nums">{glyph ? '≈' : 'ELO'} {elo} · {color === 'white' ? 'blancas' : 'negras'}</span>
      </div>
      {/* captura piezas del color contrario */}
      <CapturedRow ids={captured} color={color === 'white' ? 'b' : 'w'} advantage={advantage} />
      {ms !== undefined && <ClockFace ms={ms} active={!!clockActive} />}
    </div>
  );
}
