import type { Metadata } from 'next';
import { RankingPage } from '@/modules/ranking/presentation/components/RankingPage';

export const metadata: Metadata = { title: 'Ranking · Chess Predictor Pro' };

export default function Page() {
  return <RankingPage />;
}
