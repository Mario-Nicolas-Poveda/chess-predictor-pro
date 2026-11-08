import type { Metadata } from 'next';
import { RoleGate } from '@/modules/auth/presentation/components/GuestLayer';
import { PlayScreen } from '@/modules/matchmaking/presentation/components/PlayScreen';

export const metadata: Metadata = { title: 'Jugar · Chess Predictor Pro' };

export default function PlayPage() {
  return <RoleGate feature="playOnline"><PlayScreen /></RoleGate>;
}
