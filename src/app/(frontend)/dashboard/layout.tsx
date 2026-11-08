import { Suspense } from 'react';
import { FocusModeProvider, HiddenInFocus } from '@/components/layout/FocusMode';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { GuestBarSlot } from '@/modules/auth/presentation/components/GuestLayer';
import { UpgradeDialog } from '@/modules/auth/presentation/components/UpgradeDialog';
import { SessionProvider } from '@/modules/dashboard/presentation/hooks/useProfile';
import { PreferencesProvider } from '@/modules/dashboard/presentation/preferences/PreferencesProvider';

export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  return (
    <SessionProvider>
      <PreferencesProvider>
        <FocusModeProvider>
          <div className="min-h-dvh">
            {/* en plena partida la arena pinta su propia cabecera (modo enfoque) */}
            <HiddenInFocus>
              <GuestBarSlot />
              {/* en /dashboard/arena/[id] la ruta solo se conoce en la petición: usePathname necesita Suspense */}
              <Suspense fallback={<div className="h-[60px]" />}><SiteHeader /></Suspense>
            </HiddenInFocus>
            {/* sin max-w: las bandas del perfil van a ancho completo y cada pantalla centra su contenido */}
            <main>{children}</main>
          </div>
          {/* uno para toda la app: lo abren los candados y cualquier 403 ACCOUNT_REQUIRED */}
          <UpgradeDialog />
        </FocusModeProvider>
      </PreferencesProvider>
    </SessionProvider>
  );
}
