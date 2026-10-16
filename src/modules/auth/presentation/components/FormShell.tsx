import type { ReactNode } from 'react';
import Link from 'next/link';
import { GoogleButton } from './GoogleButton';

type Props = { title: string; lead: string; alert?: string; aside: { text: string; href: string; cta: string }; children: ReactNode };

// Logo y enlace al otro formulario arriba; título, aviso, formulario, "o" y Google centrados.
export function FormShell({ title, lead, alert, aside, children }: Props) {
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        {/* sin precarga: la landing aún importa three directamente y en móvil no debe descargarse aquí */}
        <Link href="/" prefetch={false} className="font-display text-2xl text-ink">Chess Predictor <em className="text-wine">Pro</em></Link>
        <p className="text-caption">{aside.text} <Link href={aside.href} className="text-wine-deep hover:underline underline-offset-4">{aside.cta} ›</Link></p>
      </div>
      <div className="mx-auto flex w-full max-w-[420px] grow flex-col justify-center gap-[22px] animate-rise">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-[80px] font-semibold leading-none tracking-[-.02em]">{title}</h1>
          <p className="text-ink-soft">{lead}</p>
        </div>
        {alert && <p role="alert" className="border-l-2 border-danger pl-3 text-caption text-danger animate-rise">{alert}</p>}
        {children}
        <p aria-hidden="true" className="text-center text-[13px] text-ink-faint">o</p>
        <GoogleButton />
      </div>
    </>
  );
}
