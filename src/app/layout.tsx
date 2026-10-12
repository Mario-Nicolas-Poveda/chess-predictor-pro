import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { cormorant, manrope, jetbrains } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chess Predictor Pro',
  description: 'Juega, analiza y predice partidas de ajedrez.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${cormorant.variable} ${manrope.variable} ${jetbrains.variable}`}>
      <body>
        {children}
        <Toaster position="bottom-right" toastOptions={{ style: { background: '#2a1417', color: '#f5ece0', border: 'none' } }} />
      </body>
    </html>
  );
}
