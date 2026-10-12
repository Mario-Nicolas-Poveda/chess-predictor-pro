import type { ReactNode } from 'react';

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-rule pt-6">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-3xl text-ink">{title}</h2>
        {aside && <div className="eyebrow">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-rule ${className}`} />;
}
