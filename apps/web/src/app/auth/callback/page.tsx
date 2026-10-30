import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/components/container';
import { AuthCallback } from './callback';

export const metadata: Metadata = { title: 'Signing in', robots: { index: false, follow: false } };

export default function CallbackPage() {
  return (
    <Container>
      <Suspense>
        <AuthCallback />
      </Suspense>
    </Container>
  );
}
