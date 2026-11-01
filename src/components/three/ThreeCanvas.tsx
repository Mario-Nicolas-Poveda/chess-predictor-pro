import type { CSSProperties, ReactNode, Ref } from 'react';

type Props = { ref: Ref<HTMLCanvasElement>; ready: boolean; className?: string; style?: CSSProperties; children?: ReactNode };

// Mientras carga se ve un degradado del tema, nunca un hueco vacío; el canvas entra con un fundido. La alternativa sin WebGL la decide quien lo usa.
export function ThreeCanvas({ ref, ready, className = '', style, children }: Props) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,var(--t-rule),transparent_68%)]" />
      <canvas ref={ref} aria-hidden="true"
        className={`absolute inset-0 size-full transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} />
      {children}
    </div>
  );
}
