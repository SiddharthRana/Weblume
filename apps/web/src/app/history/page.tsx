import type { Metadata } from 'next';
import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { HistoryList } from './history-list';

export const metadata: Metadata = {
  title: 'Scan history',
  robots: { index: false, follow: false },
};

export default function HistoryPage() {
  return (
    <>
      <PageHeader eyebrow="History" title="Your recent scans">
        Scans started in this browser. Account history across devices arrives with sign-in.
      </PageHeader>
      <Container className="max-w-3xl py-12">
        <HistoryList />
      </Container>
    </>
  );
}
