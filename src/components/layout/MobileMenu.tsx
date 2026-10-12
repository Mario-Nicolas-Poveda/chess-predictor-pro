'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { NAV } from './nav';
import { UserBlock } from './UserBlock';

export function MobileMenu({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const close = () => ref.current?.close();

  return (
    <div className={className}>
      <button type="button" onClick={() => ref.current?.showModal()} aria-label="Abrir menú"
        className="grid size-10 place-items-center rounded-md text-ink hover:bg-ink/5">
        <Menu size={22} aria-hidden="true" />
      </button>

      <dialog ref={ref} aria-label="Menú"
        className="m-0 h-dvh max-h-none w-full max-w-none bg-paper p-0 text-ink backdrop:bg-transparent">
        <div className="flex h-full flex-col px-4 sm:px-8">
          <div className="flex h-20 items-center justify-between border-b border-rule">
            <span className="font-display text-[1.6rem] leading-none">Chess Predictor <em className="text-wine">Pro</em></span>
            <button type="button" onClick={close} aria-label="Cerrar menú"
              className="grid size-10 place-items-center rounded-md hover:bg-ink/5">
              <X size={22} aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Principal" className="flex-1 py-8">
            <ul className="space-y-4">
              {NAV.map(it => {
                const active = pathname.startsWith(it.href);
                return (
                  <li key={it.href} className="font-display text-3xl">
                    {it.ready ? (
                      <Link href={it.href} onClick={close} aria-current={active ? 'page' : undefined}
                        className={active ? 'text-wine' : 'text-ink hover:text-wine'}>
                        {it.label}
                      </Link>
                    ) : (
                      <span aria-disabled="true" className="text-ink-faint">
                        {it.label} <span className="eyebrow align-middle">Sprint {it.sprint}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <UserBlock className="flex border-t border-rule py-6" />
        </div>
      </dialog>
    </div>
  );
}
