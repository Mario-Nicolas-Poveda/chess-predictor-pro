'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { NAV } from './nav';
import { UserBlock } from './UserBlock';

export function MobileMenu({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const close = () => ref.current?.close();

  return (
    <div className={className}>
      <button type="button" onClick={() => ref.current?.showModal()}
        className="h-10 rounded-full px-4 text-caption font-medium shadow-[inset_0_0_0_1px_var(--t-ink)] hover:bg-band">
        Menú
      </button>

      <dialog ref={ref} aria-label="Menú" className="sheet">
        <div className="flex h-full flex-col px-6">
          <div className="flex h-[60px] items-center justify-end">
            <button type="button" onClick={close} aria-label="Cerrar menú"
              className="grid size-10 place-items-center rounded-full hover:bg-band">
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Principal" className="flex-1 py-6">
            <ul className="space-y-4">
              {NAV.map(it => {
                const active = pathname.startsWith(it.href);
                return (
                  <li key={it.href} className="font-display text-3xl">
                    {it.ready ? (
                      <Link href={it.href} onClick={close} aria-current={active ? 'page' : undefined}
                        className={active ? 'text-accent' : 'text-ink hover:text-accent'}>
                        {it.label}
                      </Link>
                    ) : (
                      <span aria-disabled="true" className="text-muted">
                        {it.label} <span className="eyebrow align-middle">Sprint {it.sprint}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <UserBlock className="flex py-6" />
        </div>
      </dialog>
    </div>
  );
}
