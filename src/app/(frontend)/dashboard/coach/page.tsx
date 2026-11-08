import type { Metadata } from 'next';
import { RoleGate } from '@/modules/auth/presentation/components/GuestLayer';
import { CoachPage } from '@/modules/coach/presentation/components/CoachPage';

export const metadata: Metadata = { title: 'Entrenador · Chess Predictor Pro' };

export default function Page() {
  return <RoleGate feature="coach"><CoachPage /></RoleGate>;
}
