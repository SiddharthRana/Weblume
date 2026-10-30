import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequireAuth } from '@/components/auth/require-auth';
import { Container } from '@/components/container';
import { Dashboard } from './dashboard';

export const metadata: Metadata = { title: 'Dashboard', robots: { index: false, follow: false } };

export default function DashboardPage() {
  return (
    <Container>
      <RequireAuth>
        <Suspense>
          <Dashboard />
        </Suspense>
      </RequireAuth>
    </Container>
  );
}
