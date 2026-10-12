import Link from 'next/link';

const logo = <>Chess Predictor <em className="text-wine-tint">Pro</em></>;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-ink text-cream lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div aria-hidden="true" className="absolute inset-0 opacity-20"
          style={{ background: 'repeating-conic-gradient(var(--color-wine) 0 25%, transparent 0 50%) 0 0 / 64px 64px' }} />
        <Link href="/" className="relative font-display text-[1.6rem] leading-none">{logo}</Link>
        <div className="relative">
          <p className="font-display text-6xl italic leading-[1.05]">Cada partida empieza<br />con una jugada.</p>
          <p className="mt-6 font-mono text-sm text-sand">1. e4</p>
        </div>
      </aside>

      <div className="flex h-14 items-center bg-ink px-4 text-cream lg:hidden">
        <Link href="/" className="font-display text-xl leading-none">{logo}</Link>
      </div>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8 lg:py-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
