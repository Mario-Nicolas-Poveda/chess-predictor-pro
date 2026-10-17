import type { ReactNode } from 'react';
import { PracticePanel } from '@/modules/auth/presentation/practice/PracticePanel';

// Login y registro comparten el tablero 3D de la izquierda (solo escritorio).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-paper">
      <PracticePanel />
      <section className="flex min-w-0 flex-[1_1_460px] flex-col gap-10 px-[clamp(24px,6vw,104px)] py-10">
        {children}
        <p className="text-center text-xs text-ink-faint">Chess Predictor Pro · Proyecto de aula · Universidad Popular del Cesar</p>
      </section>
    </div>
  );
}
