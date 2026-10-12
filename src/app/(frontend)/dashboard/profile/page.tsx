import type { Metadata } from 'next';
import { ProfileView } from '@/modules/dashboard/presentation/components/ProfileView';

export const metadata: Metadata = { title: 'Perfil · Chess Predictor Pro' };

export default function ProfilePage() {
  return <ProfileView />;
}
