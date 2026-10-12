import type { ComponentProps } from 'react';

export const control = 'w-full rounded-md border border-rule bg-vellum px-3 text-ink placeholder:text-ink-faint focus:border-wine focus:outline-none focus:ring-2 focus:ring-wine/15 aria-[invalid=true]:border-danger';

export function Input({ className = '', ...rest }: ComponentProps<'input'>) {
  return <input className={`h-11 ${control} ${className}`} {...rest} />;
}

export function Textarea({ className = '', ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={`min-h-24 py-2.5 ${control} ${className}`} {...rest} />;
}

export function Select({ className = '', ...rest }: ComponentProps<'select'>) {
  return <select className={`h-11 ${control} ${className}`} {...rest} />;
}
