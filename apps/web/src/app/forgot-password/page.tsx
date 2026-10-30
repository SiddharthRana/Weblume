import type { Metadata } from 'next';
import { Container } from '@/components/container';
import { ForgotForm } from './forgot-form';

export const metadata: Metadata = { title: 'Reset your password', robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <Container>
      <ForgotForm />
    </Container>
  );
}
