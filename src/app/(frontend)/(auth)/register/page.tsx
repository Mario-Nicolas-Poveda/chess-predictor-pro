import type { Metadata } from 'next';
import { RegisterForm } from '@/modules/auth/presentation/components/RegisterForm';

export const metadata: Metadata = { title: 'Crear cuenta · Chess Predictor Pro' };

export default function RegisterPage() {
  return <RegisterForm />;
}
