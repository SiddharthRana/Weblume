import type { Metadata } from 'next';
import { Container } from '@/components/container';
import { ResetForm } from './reset-form';

export const metadata: Metadata = {
  title: 'Choose a new password',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Container>
      <ResetForm />
    </Container>
  );
}
