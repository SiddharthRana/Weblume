import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/components/container';
import { PauseMonitor } from './pause-monitor';

export const metadata: Metadata = {
  title: 'Pause monitoring',
  robots: { index: false, follow: false },
};

export default function PauseMonitoringPage() {
  return (
    <Container className="py-12">
      <Suspense>
        <PauseMonitor />
      </Suspense>
    </Container>
  );
}
