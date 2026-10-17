'use client';

import { useState, type ComponentProps } from 'react';
import { Input } from '@/components/ui/Input';

export function PasswordInput(props: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-[92px]" />
      <button type="button" onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}
        className="absolute right-2 top-2 h-9 rounded-full px-3 text-caption font-medium text-wine-deep hover:bg-wash">
        {visible ? 'Ocultar' : 'Mostrar'}
      </button>
    </div>
  );
}
