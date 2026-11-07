import localFont from 'next/font/local';
import { Cormorant_Garamond, Manrope, JetBrains_Mono } from 'next/font/google';

export const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-cormorant', display: 'swap' });
export const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
export const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains', display: 'swap', preload: false });
// Las 12 piezas (U+2654–265F) de Noto Sans Symbols 2 (OFL 1.1), recortadas con pyftsubset: 2,8 KB en vez de 230 KB (#171).
// Con preload: el tablero 2D del primer HTML se pinta ya con su fuente.
export const chessSymbols = localFont({ src: './chess-pieces.woff2', variable: '--font-chess-symbols', display: 'swap', preload: true });
