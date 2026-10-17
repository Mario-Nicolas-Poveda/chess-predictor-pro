type Props = { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean };

/** Interruptor 44×26 con la perilla que se desliza (transform). */
export function Switch({ checked, onChange, label, disabled }: Props) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${checked ? 'bg-ink' : 'bg-rule'}`}>
      <span aria-hidden="true" className={`absolute left-[3px] top-[3px] size-5 rounded-full bg-paper transition-transform duration-200 ${checked ? 'translate-x-[18px]' : ''}`} />
    </button>
  );
}
