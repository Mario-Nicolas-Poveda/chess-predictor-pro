import type { Metadata } from 'next';
import { Landing } from './_components/landing/Landing';

export const metadata: Metadata = { title: 'Chess Predictor Pro' };

export default function Home() {
  return <Landing />;
}
