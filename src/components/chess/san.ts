const ES: Record<string, string> = { K: 'R', Q: 'D', R: 'T', B: 'A', N: 'C' };

/** 'Nxf7+' → 'Cxf7+', 'e8=Q' → 'e8=D'. O-O y las jugadas de peón no cambian (la columna b no se toca). */
export const sanEs = (san: string) =>
  san.replace(/^[KQRBN]/, c => ES[c]!).replace(/=([QRBN])/, (_, c: string) => '=' + ES[c]);

/** Normaliza lo que escribe el usuario (español, o inglés salvo la torre) para compararlo con sanEs de las legales. */
export const normSan = (s: string) =>
  s.trim().replace(/[+#!?x=\s]/g, '').replace(/0/g, 'O')
    .replace(/^K/, 'R').replace(/^Q/, 'D').replace(/^N/, 'C').replace(/^B(?=[a-h]?[1-8]?[a-h][1-8])/, 'A')
    .replace(/Q$/, 'D').replace(/N$/, 'C').replace(/B$/, 'A');
