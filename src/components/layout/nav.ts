export type NavItem = { href: string; label: string; ready: boolean; sprint: number; isNew?: boolean; also?: string };

export const NAV: NavItem[] = [
  { href: '/dashboard/profile',     label: 'Perfil',       ready: true,  sprint: 1 },
  { href: '/dashboard/play',        label: 'Jugar',        ready: true,  sprint: 2, isNew: true, also: '/dashboard/arena' },
  { href: '/dashboard/ai',          label: 'Contra la IA', ready: false, sprint: 4 },
  { href: '/dashboard/coach',       label: 'Coach',        ready: false, sprint: 5 },
  { href: '/dashboard/tournaments', label: 'Torneos',      ready: false, sprint: 6 },
  { href: '/dashboard/ranking',     label: 'Ranking',      ready: false, sprint: 6 },
];

// La página de la partida cuenta como parte de Jugar.
export const isActive = (it: NavItem, pathname: string) =>
  pathname.startsWith(it.href) || (!!it.also && pathname.startsWith(it.also));
