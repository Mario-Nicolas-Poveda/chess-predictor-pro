import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DevArena } from '@/modules/arena/presentation/components/DevArena';
import { PreferencesProvider } from '@/modules/dashboard/presentation/preferences/PreferencesProvider';

export const metadata: Metadata = { title: 'Arena de prueba · Chess Predictor Pro', robots: { index: false } };

// Solo con ENABLE_DEV_ROUTES=true (se evalúa al compilar): la arena contra un bot local, sin backend.
export default function DevArenaPage() {
  if (process.env.ENABLE_DEV_ROUTES !== 'true') notFound();
  // fuera del dashboard: preferencias por defecto en memoria (el tablero 3D o 2D las lee)
  return <PreferencesProvider persist={false}><DevArena /></PreferencesProvider>;
}
