export type NavItem = { href: string; label: string; ready: boolean; sprint: number };

export const NAV: NavItem[] = [
  { href: '/dashboard/profile',     label: 'Perfil',       ready: true,  sprint: 1 },
  { href: '/dashboard/play',        label: 'Jugar',        ready: false, sprint: 2 },
  { href: '/dashboard/ai',          label: 'Contra la IA', ready: false, sprint: 4 },
  { href: '/dashboard/coach',       label: 'Coach',        ready: false, sprint: 5 },
  { href: '/dashboard/tournaments', label: 'Torneos',      ready: false, sprint: 6 },
  { href: '/dashboard/ranking',     label: 'Ranking',      ready: false, sprint: 6 },
];
