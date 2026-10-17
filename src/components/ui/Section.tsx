import type { CSSProperties, ReactNode } from 'react';

/** Banda a ancho completo (`paper` o `band`) con el contenido centrado a 1200 px. Sin bordes entre secciones. */
export function Band({ id, tone = 'paper', className = '', style, labelledBy, children }:
  { id?: string; tone?: 'paper' | 'band'; className?: string; style?: CSSProperties; labelledBy?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={labelledBy} style={style}
      className={`px-5 py-16 transition-colors duration-500 lg:px-10 lg:py-[96px] ${tone === 'band' ? 'bg-band' : 'bg-paper'} ${className}`}>
      <div className="mx-auto max-w-[1200px]">{children}</div>
    </section>
  );
}

/** "Rendimiento." con punto final y subtítulo opcional. */
export function SectionTitle({ id, lead, children }: { id?: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex max-w-[560px] flex-col gap-2.5">
      <h2 id={id} className="font-display text-[clamp(2.5rem,5vw,3.5rem)] font-semibold leading-[1.04] tracking-[-.01em]">{children}</h2>
      {lead && <p className="text-ink-soft">{lead}</p>}
    </div>
  );
}

/** Cifra grande con la etiqueta DEBAJO (nunca encima ni pegada); lining para que no tape la etiqueta. */
export function BigNumber({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="order-last mt-3 text-[15px] text-ink-soft">{label}</dt>
      <dd className={`m-0 font-display text-[88px] leading-[.9] nums ${className}`}>{children}</dd>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-rule ${className}`} />;
}
