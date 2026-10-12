import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/modules/auth/presentation/components/LoginForm';

export const metadata: Metadata = { title: 'Entrar · Chess Predictor Pro' };

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
