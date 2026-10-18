import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DevArena } from '@/modules/arena/presentation/components/DevArena';

export const metadata: Metadata = { title: 'Arena de prueba · Chess Predictor Pro', robots: { index: false } };

// Solo con ENABLE_DEV_ROUTES=true (se evalúa al compilar): la arena contra un bot local, sin backend.
export default function DevArenaPage() {
  if (process.env.ENABLE_DEV_ROUTES !== 'true') notFound();
  return <DevArena />;
}
