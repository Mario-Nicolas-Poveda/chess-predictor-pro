import { Cormorant_Garamond, Manrope, JetBrains_Mono } from 'next/font/google';

export const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-cormorant' });
export const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
export const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains' });
