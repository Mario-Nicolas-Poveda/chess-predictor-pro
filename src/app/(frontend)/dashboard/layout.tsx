import { TopNav } from '@/components/layout/TopNav';

export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  return (
    <div className="min-h-dvh">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8 lg:px-14 lg:py-16">{children}</main>
    </div>
  );
}
