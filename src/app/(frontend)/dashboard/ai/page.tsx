import type { Metadata } from 'next';
import { AiLobby } from '@/modules/ai-engine/presentation/components/AiLobby';

export const metadata: Metadata = { title: 'Contra la IA · Chess Predictor Pro' };

export default function AiPage() {
  return <AiLobby />;
}
