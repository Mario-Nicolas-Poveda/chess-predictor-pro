import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { cormorant, manrope, jetbrains, chessSymbols } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chess Predictor Pro',
  description: 'Juega, analiza y predice partidas de ajedrez.',
};

// Aplica el último tema conocido antes de pintar (solo caché; la verdad está en la API).
const themeCache = "try{if(location.pathname.indexOf('/dashboard')===0){var p=JSON.parse(localStorage.getItem('cpp:prefs')||'null');if(p){var d=document.documentElement;d.dataset.theme=p.theme;d.dataset.accent=p.accent}}}catch(e){}";

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // suppressHydrationWarning: el script de tema y extensiones como Dark Reader tocan <html> antes de hidratar
    <html lang="es" className={`${cormorant.variable} ${manrope.variable} ${jetbrains.variable} ${chessSymbols.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeCache }} />
        {/* el tema ya trae sus colores; que Dark Reader no lo repinte */}
        <meta name="darkreader-lock" />
      </head>
      <body>
        <MotionProvider>{children}</MotionProvider>
        <Toaster position="bottom-right" toastOptions={{ style: { background: '#2a1417', color: '#f5ece0', border: 'none' } }} />
      </body>
    </html>
  );
}
