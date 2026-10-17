import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProfileDemo } from '@/modules/dashboard/presentation/components/ProfileDemo';

export const metadata: Metadata = { title: 'Perfil de muestra · Chess Predictor Pro', robots: { index: false } };

// Solo con ENABLE_DEV_ROUTES=true (se evalúa al compilar): perfil con datos de ejemplo para ver la gráfica y la tira llenas.
export default function DevProfilePage() {
  if (process.env.ENABLE_DEV_ROUTES !== 'true') notFound();
  return <ProfileDemo />;
}
