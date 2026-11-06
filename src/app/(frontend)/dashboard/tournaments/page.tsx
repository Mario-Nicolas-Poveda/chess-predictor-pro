import type { Metadata } from 'next';
import { TournamentsPage } from '@/modules/tournaments/presentation/components/TournamentsPage';

export const metadata: Metadata = { title: 'Torneos · Chess Predictor Pro' };

export default function Page() {
  return <TournamentsPage />;
}
