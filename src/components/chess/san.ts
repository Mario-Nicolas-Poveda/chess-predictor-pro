export { sanEs } from '@/modules/coach/domain/notation';

/** Normaliza lo que escribe el usuario (español, o inglés salvo la torre) para compararlo con sanEs de las legales. */
export const normSan = (s: string) =>
  s.trim().replace(/[+#!?x=\s]/g, '').replace(/0/g, 'O')
    .replace(/^K/, 'R').replace(/^Q/, 'D').replace(/^N/, 'C').replace(/^B(?=[a-h]?[1-8]?[a-h][1-8])/, 'A')
    .replace(/Q$/, 'D').replace(/N$/, 'C').replace(/B$/, 'A');
