/** Notación en español. Sin dependencias: lo usan el servidor (prompt) y el navegador. */
const ES: Record<string, string> = { K: 'R', Q: 'D', R: 'T', B: 'A', N: 'C' };

/** 'Nxf7+' → 'Cxf7+', 'e8=Q' → 'e8=D'. O-O y las jugadas de peón no cambian (la columna b no se toca). */
export const sanEs = (san: string) =>
  san.replace(/^[KQRBN]/, c => ES[c]!).replace(/=([QRBN])/, (_, c: string) => '=' + ES[c]);

/** "14… Cxe5" (negras) o "14. d4" (blancas). */
export const moveLabel = (m: { ply: number; san: string }) =>
  `${Math.ceil(m.ply / 2)}${m.ply % 2 ? '.' : '…'} ${sanEs(m.san)}`;
