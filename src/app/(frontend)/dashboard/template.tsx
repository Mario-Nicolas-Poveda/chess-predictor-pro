import type { ReactNode } from 'react';

// Se vuelve a montar en cada navegación: la entrada se repite. Con CSS, el contenido se ve aunque el JS no haya llegado.
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return <div className="animate-enter">{children}</div>;
}
