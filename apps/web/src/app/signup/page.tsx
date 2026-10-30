import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/components/container';
import { SignupForm } from './signup-form';

export const metadata: Metadata = {
  title: 'Create a free account',
  description: 'Create a free Weblume account for more scans and saved report history.',
  alternates: { canonical: '/signup' },
};

export default function SignupPage() {
  return (
    <Container>
      <Suspense>
        <SignupForm />
      </Suspense>
    </Container>
  );
}
