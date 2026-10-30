import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/components/container';
import { RequireAuth } from '@/components/auth/require-auth';
import { CompareView } from './compare-view';

export const metadata: Metadata = {
  title: 'Compare scans',
  robots: { index: false, follow: false },
};

export default function ComparePage() {
  return (
    <RequireAuth>
      <Container className="py-12">
        <Suspense>
          <CompareView />
        </Suspense>
      </Container>
    </RequireAuth>
  );
}
