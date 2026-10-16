import type { ComponentProps } from 'react';

export const control = 'w-full rounded-[14px] border border-rule bg-vellum px-4 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none aria-[invalid=true]:border-danger';

export function Input({ className = '', ...rest }: ComponentProps<'input'>) {
  return <input className={`h-[52px] ${control} ${className}`} {...rest} />;
}

export function Textarea({ className = '', ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={`min-h-24 py-2.5 ${control} ${className}`} {...rest} />;
}

export function Select({ className = '', ...rest }: ComponentProps<'select'>) {
  return <select className={`h-[52px] ${control} ${className}`} {...rest} />;
}
