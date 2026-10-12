import type { ComponentProps } from 'react';

type Variant = 'primary' | 'secondary' | 'quiet';

const VARIANTS: Record<Variant, string> = {
  primary: 'h-10 rounded-md bg-wine px-4 text-cream hover:bg-wine-deep',
  secondary: 'h-10 rounded-md border border-ink/20 px-4 text-ink hover:border-ink/45',
  quiet: 'text-wine underline-offset-4 hover:underline',
};

type Props = ComponentProps<'button'> & { variant?: Variant; loading?: boolean };

export function Button({ variant = 'primary', loading = false, disabled, className = '', children, type = 'button', ...rest }: Props) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...rest}>
      {loading && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {children}
    </button>
  );
}
