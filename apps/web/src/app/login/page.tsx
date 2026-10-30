import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/components/container';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Log in', alternates: { canonical: '/login' } };

export default function LoginPage() {
  return (
    <Container>
      <Suspense>
        <LoginForm />
      </Suspense>
    </Container>
  );
}
