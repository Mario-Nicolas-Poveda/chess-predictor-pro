import { cloneElement, useId, type ReactElement } from 'react';

type ControlProps = { id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string };

type Props = { label: string; hint?: string; error?: string; children: ReactElement<ControlProps> };

export function Field({ label, hint, error, children }: Props) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">{label}</label>
      {cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && <p id={hintId} className="text-xs text-ink-faint">{hint}</p>}
      {error && <p id={errorId} className="text-xs text-danger">{error}</p>}
    </div>
  );
}
