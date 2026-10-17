export const START_FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';   // 1.e4 e5 2.Cf3 Cc6

// Respuesta del rival según la jugada del usuario (from+to)
export const REPLIES: Record<string, string> = {
  f1c4: 'f8c5', f1b5: 'a7a6', d2d4: 'e5d4', b1c3: 'g8f6', f3e5: 'c6e5', f3g5: 'd8g5', f1e2: 'g8f6', d2d3: 'g8f6',
};
export const FALLBACK_REPLIES = ['g8f6', 'd7d6', 'f8e7', 'h7h6', 'a7a6'];

export type Candidate = { from: string; to: string; pct: number; name: string; san: string };

// Jugadas candidatas por historial (from+to separados por espacio). Porcentajes de ejemplo.
export const CANDIDATES: Record<string, Candidate[]> = {
  '': [
    { from: 'f1', to: 'c4', pct: 52, name: 'Italiana', san: 'Ac4' },
    { from: 'f1', to: 'b5', pct: 31, name: 'Española', san: 'Ab5' },
    { from: 'd2', to: 'd4', pct: 17, name: 'Escocesa', san: 'd4' },
  ],
  'f1c4 f8c5': [
    { from: 'c2', to: 'c3', pct: 41, name: 'Giuoco piano', san: 'c3' },
    { from: 'd2', to: 'd3', pct: 27, name: 'Pianissimo', san: 'd3' },
    { from: 'b1', to: 'c3', pct: 19, name: 'Desarrollo', san: 'Cc3' },
  ],
  'f1b5 a7a6': [
    { from: 'b5', to: 'a4', pct: 58, name: 'Retirada', san: 'Aa4' },
    { from: 'b5', to: 'c6', pct: 24, name: 'Variante del cambio', san: 'Axc6' },
    { from: 'b1', to: 'c3', pct: 11, name: 'Desarrollo', san: 'Cc3' },
  ],
  'd2d4 e5d4': [
    { from: 'f3', to: 'd4', pct: 71, name: 'Recaptura', san: 'Cxd4' },
    { from: 'c2', to: 'c3', pct: 18, name: 'Gambito Göring', san: 'c3' },
    { from: 'f1', to: 'c4', pct: 11, name: 'Gambito escocés', san: 'Ac4' },
  ],
};
