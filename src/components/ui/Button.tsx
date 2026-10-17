import type { ComponentProps } from 'react';

type Variant = 'primary' | 'ghost' | 'quiet';

// Píldoras sin sombra; el principal rellena con el acento (uno por sección).
const VARIANTS: Record<Variant, string> = {
  primary: 'h-12 rounded-full bg-accent px-7 text-on-accent transition-[filter,transform] hover:brightness-95 active:scale-[.98]',
  ghost: 'h-12 rounded-full px-7 text-ink shadow-[inset_0_0_0_1px_var(--t-ink)] transition-[background-color,transform] hover:bg-band active:scale-[.98]',
  quiet: 'text-accent underline-offset-4 hover:underline',
};

/** Mismas clases para un <Link> que debe verse como botón. */
export const buttonClass = (variant: Variant = 'primary') =>
  `inline-flex items-center justify-center gap-2 font-medium ${VARIANTS[variant]}`;

type Props = ComponentProps<'button'> & { variant?: Variant; loading?: boolean };

export function Button({ variant = 'primary', loading = false, disabled, className = '', children, type = 'button', ...rest }: Props) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={`${buttonClass(variant)} disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...rest}>
      {loading && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {children}
    </button>
  );
}
