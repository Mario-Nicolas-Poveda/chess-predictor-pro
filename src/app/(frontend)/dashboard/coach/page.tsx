import type { Metadata } from 'next';
import { CoachPage } from '@/modules/coach/presentation/components/CoachPage';

export const metadata: Metadata = { title: 'Entrenador · Chess Predictor Pro' };

export default function Page() {
  return <CoachPage />;
}
