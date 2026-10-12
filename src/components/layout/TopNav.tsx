'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV, type NavItem } from './nav';
import { UserBlock, type NavUser } from './UserBlock';
import { MobileMenu } from './MobileMenu';

export function TopNav({ user }: { user?: NavUser }) {
  const pathname = usePathname();
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex h-20 max-w-6xl items-center gap-8 px-4 sm:px-8 lg:px-14">
        <Link href="/" className="font-display text-[1.6rem] leading-none text-ink">
          Chess Predictor <em className="text-wine">Pro</em>
        </Link>

        <nav aria-label="Principal" className="mx-auto hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV.map(it => <NavLink key={it.href} item={it} active={pathname.startsWith(it.href)} />)}
          </ul>
        </nav>

        <UserBlock user={user} className="hidden md:flex" />
        <MobileMenu user={user} className="ml-auto md:hidden" />
      </div>
    </header>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const base = 'relative flex h-20 items-center text-[15px]';
  if (!item.ready) return (
    <li><span aria-disabled="true" title={`Disponible en el Sprint ${item.sprint}`}
      className={`${base} cursor-not-allowed text-ink-faint`}>{item.label}</span></li>
  );
  return (
    <li><Link href={item.href} aria-current={active ? 'page' : undefined}
      className={`${base} transition-colors hover:text-ink ${active
        ? 'font-medium text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-wine'
        : 'text-ink-soft'}`}>
      {item.label}
    </Link></li>
  );
}
