import { Cormorant_Garamond, Manrope, JetBrains_Mono, Noto_Sans_Symbols_2 } from 'next/font/google';

export const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-cormorant', display: 'swap' });
export const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
export const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains', display: 'swap', preload: false });
// Glifos ♔♕♖♗♘♙ del selector de pieza y de las alternativas 2D; sin preload para no cargarla en todas las páginas.
export const chessSymbols = Noto_Sans_Symbols_2({ subsets: ['symbols'], weight: '400', variable: '--font-chess-symbols', display: 'swap', preload: false });
