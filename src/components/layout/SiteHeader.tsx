'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMotionValueEvent, useScroll } from 'motion/react';
import * as m from 'motion/react-m';
import { SPRING } from '@/lib/motion';
import { NAV, type NavItem } from './nav';
import { UserBlock } from './UserBlock';
import { MobileMenu } from './MobileMenu';

export function Logo() {
  return (
    <Link href="/" className="font-display text-[1.45rem] leading-none text-ink">
      Chess Predictor <em className="text-accent">Pro</em>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  // setState solo al cruzar el umbral, no en cada píxel
  useMotionValueEvent(scrollY, 'change', y => { const s = y > 8; setScrolled(prev => (prev === s ? prev : s)); });

  // subrayado deslizante: se mide el enlace activo y se mueve con transform
  useLayoutEffect(() => {
    const ul = listRef.current;
    if (!ul) return;
    const measure = () => {
      const a = ul.querySelector<HTMLElement>('[aria-current="page"]');
      setBar(a ? { x: a.offsetLeft, w: a.offsetWidth } : null);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(ul);
    return () => ro.disconnect();
  }, [pathname]);

  return (
    <header data-scrolled={scrolled}
      className="sticky top-0 z-20 transition-colors duration-300 data-[scrolled=true]:bg-paper/82 data-[scrolled=true]:backdrop-blur-[20px] data-[scrolled=true]:backdrop-saturate-150">
      <div className="mx-auto flex min-h-[60px] max-w-[1200px] items-center gap-8 px-5 lg:px-10">
        <Logo />
        {/* barra completa solo desde 1024 px: con 6 secciones no cabe antes */}
        <nav aria-label="Principal" className="hidden flex-1 justify-center lg:flex">
          <ul ref={listRef} className="relative flex gap-x-7 text-caption">
            {NAV.map(it => <NavLink key={it.href} item={it} active={pathname.startsWith(it.href)} />)}
            {bar && (
              <m.span aria-hidden="true" className="absolute bottom-0 left-0 h-0.5 w-px bg-accent"
                style={{ originX: 0 }} initial={false} animate={{ x: bar.x, scaleX: bar.w }} transition={SPRING} />
            )}
          </ul>
        </nav>
        <UserBlock className="hidden lg:flex" />
        <MobileMenu className="ml-auto lg:hidden" />
      </div>
    </header>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  if (!item.ready) return (
    <li><span aria-disabled="true" title="Próximamente" className="inline-block cursor-default py-5 text-muted">{item.label}</span></li>
  );
  return (
    <li>
      <Link href={item.href} aria-current={active ? 'page' : undefined}
        className={`inline-block py-5 transition-colors ${active ? 'text-ink' : 'text-ink-soft hover:text-ink'}`}>
        {item.label}{item.isNew && <span className="ml-1.5 text-[11px] font-semibold text-accent">Nuevo</span>}
      </Link>
    </li>
  );
}
