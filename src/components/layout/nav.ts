export type NavItem = { href: string; label: string; ready: boolean; sprint: number; isNew?: boolean };

// Jugar se habilita cuando exista /dashboard/play (Fase 3 del Sprint 2).
export const NAV: NavItem[] = [
  { href: '/dashboard/profile',     label: 'Perfil',       ready: true,  sprint: 1 },
  { href: '/dashboard/play',        label: 'Jugar',        ready: false, sprint: 2, isNew: true },
  { href: '/dashboard/ai',          label: 'Contra la IA', ready: false, sprint: 4 },
  { href: '/dashboard/coach',       label: 'Coach',        ready: false, sprint: 5 },
  { href: '/dashboard/tournaments', label: 'Torneos',      ready: false, sprint: 6 },
  { href: '/dashboard/ranking',     label: 'Ranking',      ready: false, sprint: 6 },
];
