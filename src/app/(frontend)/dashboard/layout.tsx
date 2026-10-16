import { SiteHeader } from '@/components/layout/SiteHeader';
import { SessionProvider } from '@/modules/dashboard/presentation/hooks/useProfile';
import { PreferencesProvider } from '@/modules/dashboard/presentation/preferences/PreferencesProvider';

export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  return (
    <SessionProvider>
      <PreferencesProvider>
        <div className="min-h-dvh">
          <SiteHeader />
          <main className="mx-auto max-w-[1200px] px-5 py-10 lg:px-10 lg:py-16">{children}</main>
        </div>
      </PreferencesProvider>
    </SessionProvider>
  );
}
