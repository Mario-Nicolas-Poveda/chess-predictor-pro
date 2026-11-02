import type { MoveClass } from '@/modules/coach/infrastructure/dto/coachSchemas';
import { MOVE_CLASS_UI, isError } from '../lib/moveClass';

/** Punto + símbolo + etiqueta (para lectores de pantalla). Hereda el color del texto: también va sobre la jugada actual. */
export function MoveClassMark({ cls }: { cls: MoveClass }) {
  if (!isError(cls)) return null;
  const c = MOVE_CLASS_UI[cls];
  return (
    <span className="ml-1 inline-flex items-center gap-1 font-mono text-xs">
      <span aria-hidden="true" className="size-2 rounded-full" style={{ background: c.color! }} />
      <span aria-hidden="true">{c.symbol}</span>
      <span className="sr-only">{c.label}</span>
    </span>
  );
}
