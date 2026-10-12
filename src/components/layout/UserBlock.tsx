export type NavUser = { username: string };

// Fase 5 (#10) añade menú de cuenta y cerrar sesión.
export function UserBlock({ user, className = '' }: { user?: NavUser; className?: string }) {
  if (!user) return null;
  return (
    <div className={`items-center gap-3 ${className}`}>
      <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-ink font-display text-lg text-cream">
        {user.username.charAt(0).toUpperCase()}
      </span>
      <span className="text-sm text-ink-soft">{user.username}</span>
    </div>
  );
}
