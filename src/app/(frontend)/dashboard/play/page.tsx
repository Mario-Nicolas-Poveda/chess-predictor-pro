import type { Metadata } from 'next';
import { PlayScreen } from '@/modules/matchmaking/presentation/components/PlayScreen';

export const metadata: Metadata = { title: 'Jugar · Chess Predictor Pro' };

export default function PlayPage() {
  return <PlayScreen />;
}
