import { Suspense } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SessionProvider } from '@/modules/dashboard/presentation/hooks/useProfile';
import { PreferencesProvider } from '@/modules/dashboard/presentation/preferences/PreferencesProvider';

export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  return (
    <SessionProvider>
      <PreferencesProvider>
        <div className="min-h-dvh">
          {/* en /dashboard/arena/[id] la ruta solo se conoce en la petición: usePathname necesita Suspense */}
          <Suspense fallback={<div className="h-[60px]" />}><SiteHeader /></Suspense>
          {/* sin max-w: las bandas del perfil van a ancho completo y cada pantalla centra su contenido */}
          <main>{children}</main>
        </div>
      </PreferencesProvider>
    </SessionProvider>
  );
}
