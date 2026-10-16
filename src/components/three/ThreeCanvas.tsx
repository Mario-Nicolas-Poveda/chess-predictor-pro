import type { CSSProperties, ReactNode, Ref } from 'react';

type Props = { ref: Ref<HTMLCanvasElement>; ready: boolean; className?: string; style?: CSSProperties; children?: ReactNode };

// El fondo del contenedor se ve mientras carga; el canvas entra con un fundido. La alternativa sin WebGL la decide quien lo usa.
export function ThreeCanvas({ ref, ready, className = '', style, children }: Props) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <canvas ref={ref} aria-hidden="true"
        className={`absolute inset-0 size-full transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} />
      {children}
    </div>
  );
}
