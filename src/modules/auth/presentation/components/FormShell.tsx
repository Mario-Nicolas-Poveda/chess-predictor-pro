import type { ReactNode } from 'react';
import { GoogleButton } from './GoogleButton';

// Título, aviso general, formulario, separador "o", Google y enlace al otro formulario.
export function FormShell({ title, alert, footer, children }: { title: string; alert?: string; footer: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-8">
      <h1 className="font-display text-5xl leading-none text-ink">{title}</h1>
      {alert && <p role="alert" className="border-l-2 border-danger pl-3 text-sm text-danger">{alert}</p>}
      {children}
      <div className="flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-rule" /><span className="eyebrow">o</span><span className="h-px flex-1 bg-rule" />
      </div>
      <GoogleButton />
      <p className="text-sm text-ink-soft">{footer}</p>
    </div>
  );
}
